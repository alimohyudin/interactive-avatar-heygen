import React, { RefObject, useEffect, useRef } from "react"
import { useAtom } from "jotai"
import { ChevronRightIcon } from "lucide-react"

import { customBgPicAtom, debugAtom } from "@/lib/atoms"

import { StartStop } from "./controls/start-stop"
import ImageWrap from "./image-wrap"
import VideoWrap from "./video-wrap"

function MediaPlayer() {
  const [customBgPic] = useAtom(customBgPicAtom)
  const [debug, setDebug] = useAtom(debugAtom)

  return (
    <div className="flex h-full w-full flex-col items-center justify-center space-y-1">
      {/* <StartStop /> */}
      <div
        className="relative flex justify-center overflow-hidden rounded-3xl border text-white"
        // [box-shadow:0_8px_34px_rgba(0,0,0,.5)]
        style={{
          backgroundImage: customBgPic ? `url(${customBgPic})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          textAlign: "center",
          width: "100%",
          //height: "500px",
        }}
      >
        <VideoWrap />
        <ImageWrap />
      </div>
      {/* make the div go to bottom center */}
      <div className="absolute bottom-8 px-4">
        <StartStop />
      </div>
      {/* <footer className="sticky bottom-0 mt-auto flex w-[500px] flex-row items-center rounded-md border py-4 font-mono text-sm">
        <ChevronRightIcon className="h-4 w-4" />
        <p>{debug}</p>
      </footer> */}
    </div>
  )
}

export default MediaPlayer
