import mediasoup from "mediasoup";
import { Server } from "socket.io";
import express from "express";
import cors from "cors";

const worker = await mediasoup.createWorker({
  logLevel: "warn",
  dtlsCertificateFile: "./certs/cert.pem",
  dtlsPrivateKeyFile: "./certs/key.pem",
});
worker.on("died", (error) => {
  console.log("media server worker has died");
  console.log(error);
  setTimeout(() => process.exit(1), 2000);
});
console.log(worker);

const mediaCodecs = [
  {
    kind: "video",
    mimeType: "video/H264",
    clockRate: 90000,
    parameters: {
      "packetization-mode": 1,
      "profile-level-id": "42e01f",
      "level-asymmetry-allowed": 1,
    },
  },
  {
    kind: "video",
    mimeType: "video/VP8",
    clockRate: 90000,
    parameters: {
      "packetization-mode": 1,
      "profile-level-id": "42e01f",
      "level-asymmetry-allowed": 1,
    },
  },
];

const router = await worker.createRouter({ mediaCodecs });
console.log(router);
let interval;
const rtpCapabilities = mediasoup.getSupportedRtpCapabilities();
console.log(rtpCapabilities);
const producerTransport = await router.createPlainTransport({
  listenIp: "192.168.29.21",
  rtcpMux: false,
  comedia: true,
  port: 2600,
});
const videoRtpPort = producerTransport.tuple.localPort;
const videoRtcpPort = producerTransport.rtcpTuple.localPort;
console.log(producerTransport);
// const producer
const producer = await producerTransport.produce({
  kind: "video",
  rtpParameters: {
    codecs: [
      {
        mimeType: "video/VP8",
        clockRate: 90000,
        payloadType: 102,
        rtcpFeedback: [], // FFmpeg does not support NACK nor PLI/FIR.
      },
    ],
    encodings: [{ ssrc: 22222222 }],
  },
});

console.log(producer);

console.log(videoRtpPort);
console.log(videoRtcpPort);
// setInterval(async () => {
//   console.log(await producer.getStats());
// }, 2000);

const app = express();

app.use(express.static("public"));
const server = app.listen(3000, () => {
  console.log("listening on 3000");
});
app.use(cors("*"));

const io = new Server(server, { cors: { origin: ["192.168.29.21"] } });
const peer = io.of("/mediasoup");
let clientRouter;
let consumer;
let clientTransport;
peer.on("connection", async (socket) => {
  //   const clientWorker = await mediasoup.createWorker({
  //     logLevel: "warn",
  //     dtlsCertificateFile: "./certs/cert.pem",
  //     dtlsPrivateKeyFile: "./certs/key.pem",
  //   });
  socket.emit("routerRtpCapabilities", router.rtpCapabilities);

  socket.on("createRecvTransport", async () => {
    // clientRouter = await worker.createRouter({ mediaCodecs });
    // const clientTransport = await clientRouter.createPlainTransport({
    //   listenIp: "0.0.0.0",
    //   rtcpMux: false,
    //   comedia: true,
    //   port: 2600,
    // });

    clientTransport = await router.createWebRtcTransport({
      listenIps: [{ ip: "192.168.29.21" }],
      enableUdp: true,
      enableTcp: true,
      //   preferUdp: true,
    });
    console.log(clientTransport);
    socket.emit("recvTransportCreated", {
      id: clientTransport.id,
      iceParameters: clientTransport.iceParameters,
      iceCandidates: clientTransport.iceCandidates,
      dtlsParameters: clientTransport.dtlsParameters,
    });
  });
  socket.on("transport-recv-connect", async ({ dtlsParameters }) => {
    console.log(`DTLS PARAMS: ${dtlsParameters}`);
    await clientTransport.connect({ dtlsParameters });
  });

  socket.on("consume", async (rtpCapability) => {
    console.log("and the answer is");
    console.log(rtpCapability);
    console.log(rtpCapabilities);
    console.log(producer);
    // clientRouter.consume({
    //   producerId: producer.id,
    //   rtpCapabilities: rtpCapability,
    // });

    console.log(
      router.canConsume({
        producerId: producer.id,
        rtpCapabilities: rtpCapability,
      })
    );
    consumer = await clientTransport.consume({
      producerId: producer.id,
      rtpCapabilities: rtpCapability,
      paused: true,
    });

    consumer.on("transportclose", () => {
      console.log("transport close from consumer");
    });
    consumer.on("producerclose", () => {
      console.log("producer of consumer closed");
    });

    const params = {
      id: consumer.id,
      producerId: producer.id,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    };
    console.log("PARAMS", params);
    socket.emit("consuming", params);
  });
  socket.on("consumer-resume", async () => {
    console.log("consumer resuming");
    interval = setInterval(async () => {
      // console.log("****************producer*************");
      const producerStats = await producer.getStats();
      console.log(producerStats, "producer");
      // console.log("****************consumer*************");
      const consumerStats = await consumer.getStats();

      console.log(consumerStats, "consumer");
    }, 3000);
    await consumer.resume();
    console.log(await producer.getStats());
    console.log(await consumer.getStats());
  });
  socket.on("disconnecting", () => {
    console.log("Byeee");
    console.log(clientTransport.close());
    if (interval) {
      clearInterval(interval);
    }
    // console.log(producerTransport.close());
  });
  //   clientTransport.consume({ producerId: producer.id, rtpCapabilities });
});
