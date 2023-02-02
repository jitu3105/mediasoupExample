 
ffmpeg \
  -re \
  -v info \
  -stream_loop -1 \
  -i ~/BigBuckBunny.mp4 \
  -map 0:v:0 \
  -pix_fmt yuv420p -c:v libvpx -b:v 1000k -deadline realtime -cpu-used 4 \
  -f tee \
 "[select=v:f=rtp:ssrc=22222222:payload_type=102]rtp://127.0.0.1:2600?rtcpport=25560"


