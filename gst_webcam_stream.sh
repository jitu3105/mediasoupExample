#!/bin/sh
 gst-launch-1.0 v4l2src device=/dev/video0 ! video/x-raw,width=640,height=480,framerate=30/1 ! queue ! videoconvert ! x264enc tune=zerolatency ! mpegtsmux ! rtpmp2tpay ! udpsink host=127.0.0.1 port=2600
