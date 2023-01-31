const io = require("socket.io-client");
const mediasoup = require("mediasoup-client");

const socket = io.connect("http://localhost:3000/mediasoup");

let routerRtpCapabilities;
let device;
socket.on("connect", async () => {
  console.log("asdasd");
});
socket.on("routerRtpCapabilities", async (rtpCapabilities) => {
  routerRtpCapabilities = rtpCapabilities;
  device = new mediasoup.Device();
  console.log(device);
  await device.load({ routerRtpCapabilities });
  console.log(device);
  socket.emit("createRecvTransport");
});

socket.on("recvTransportCreated", async (data) => {
  console.log(data);
  const consumerTransport = device.createRecvTransport(data);

  consumerTransport.on(
    "connect",
    async ({ dtlsParameters }, callback, errback) => {
      try {
        // alert("connect event launched");
        socket.emit("transport-recv-connect", {
          //   transportId: consumerTransport.id,
          dtlsParameters,
        });
        callback();
      } catch (err) {
        errback(err);
      }
    }
  );
  console.log(consumerTransport);
  console.log(device.rtpCapabilities);
  socket.emit("consume", device.rtpCapabilities);
  socket.on("consuming", async (params) => {
    console.log(params);
    consumer = await consumerTransport.consume({
      id: params.id,
      producerId: params.producerId,
      kind: params.kind,
      rtpParameters: params.rtpParameters,
    });
    console.log(consumer);
    const { track } = consumer;
    const remoteVideo = document.getElementById("remoteVideo");
    console.log(remoteVideo);
    const stream = new MediaStream([track]);
    console.log(track);
    console.log(stream);
    // console.log(await navigator.mediaDevices.getUserMedia({ video: true }));
    remoteVideo.srcObject = stream;
    remoteVideo.onloadedmetadata = () => {
      alert("asd");
      remoteVideo.play();
    };
    socket.emit("consumer-resume");
  });
});
