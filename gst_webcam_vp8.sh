#!/bin/sh
 gst-launch-1.0 v4l2src device=/dev/video0 ! video/x-raw,width=640,height=480,framerate=30/1 ! queue ! videoconvert ! vp8enc target-bitrate=1000000 ! rtpvp8pay pt=102 ssrc=22222222 ! udpsink host=127.0.0.1 port=2600 sync=false -v
