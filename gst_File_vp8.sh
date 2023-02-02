#!/bin/sh
 gst-launch-1.0 v4l2src device=/dev/video0 ! queue ! videoconvert ! vp8enc ! rtpvp8pay pt=102 ssrc=22222222 picture-id-mode=2 ! udpsink host=192.168.29.21 port=2600
