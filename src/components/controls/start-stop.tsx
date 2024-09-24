import { RefObject, useEffect, useRef, useState } from "react"
//@ts-ignore
import StreamingAvatar, { StreamingEvents, VoiceEmotion } from "@heygen/streaming-avatar"
// import {
//   Configuration,
//   NewSessionData,
//   StreamingAvatarApi,
//   NewSessionRequestVoiceEmotionEnum
// } from "@heygen/streaming-avatar"
import { useAtom } from "jotai"
import { MicIcon, PlayIcon, RefreshCcw, SquareIcon } from "lucide-react"

//

import {
  avatarAtom,
  avatarIdAtom,
  debugAtom,
  isAvatarSpeakingAtom,
  isUserSpeakingAtom,
  knowledgeBaseFileAtom,
  mediaCanvasRefAtom,
  mediaStreamActiveAtom,
  mediaStreamRefAtom,
  qualityAtom,
  streamAtom,
  voiceIdAtom,
} from "@/lib/atoms"

import { Button } from "../ui/button"
import { Chat } from "./chat"

export function StartStop() {
  const [sessionState, setSessionState] = useState("stopped")
  const [mediaStreamActive, setMediaStreamActive] = useAtom(
    mediaStreamActiveAtom
  )
  const [quality, setQuality] = useAtom(qualityAtom)
  const [avatarId, setAvatarId] = useAtom(avatarIdAtom)
  const [voiceId, setVoiceId] = useAtom(voiceIdAtom)
  const [knowledgeBaseFile] = useAtom(knowledgeBaseFileAtom)
  const [knowledgeBase, setKnowledgeBase] = useState<string>("")
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useAtom(isAvatarSpeakingAtom)
  const [isUserSpeaking, setIsUserSpeaking] = useAtom(isUserSpeakingAtom)
  const [mediaStreamRef] = useAtom(mediaStreamRefAtom)
  const [mediaCanvasRef] = useAtom(mediaCanvasRefAtom)
  //const avatar = useAtom(avatarAtom);
  const [stream, setStream] = useAtom(streamAtom) as [
    MediaStream | undefined,
    (stream: MediaStream | undefined) => void,
  ]
  const [, setDebug] = useAtom(debugAtom)

  const [avatar, setAvatar] = useAtom(avatarAtom) as [
    { current: StreamingAvatar | undefined },
    (value: { current: StreamingAvatar | undefined }) => void,
  ]
  const avatarRef = useRef<StreamingAvatar | undefined>()
  useEffect(() => {
    setAvatar(avatarRef)
  }, [setAvatar])

  useEffect(() => {
    if (stream && mediaStreamRef?.current) {
      mediaStreamRef.current.srcObject = stream
      mediaStreamRef.current.onloadedmetadata = () => {
        mediaStreamRef.current!.play()
        setDebug("Playing")
        setMediaStreamActive(true)

        // Get video dimensions
        const videoWidth = mediaStreamRef.current!.videoWidth
        const videoHeight = mediaStreamRef.current!.videoHeight
        console.log("Video dimensions:", videoWidth, videoHeight)
      }
    }
  }, [mediaStreamRef, stream])

  async function readKnowledgeBaseFromFile() {
    let response = await fetch(knowledgeBaseFile)

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`)
    }

    let text = await response.text()
    //console.log("Reading knowledge base from file:", text)
    return text
    //await setKnowledgeBase('');
  }

  async function grab() {
    setSessionState("initializing")

    const response = await fetch("/api/grab", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`)
    }
    const data = await response.json()

    // avatarRef.current = new StreamingAvatarApi(
    //   new Configuration({
    //     accessToken: data.data.data.token,
    //   })
    // )
    avatar.current = new StreamingAvatar({
      token: data.data.data.token,

    })

    let knowledgeData = ""
    if (knowledgeBaseFile) {
      //console.log("Reading knowledge base from file:", knowledgeBaseFile)
      knowledgeData = await readKnowledgeBaseFromFile()
    }

    avatar.current?.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
      console.log("Avatar started talking", e)
    })
    avatar.current?.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
      console.log("Avatar stopped talking", e)
    })
    avatar.current?.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      console.log("Stream disconnected")
      //endSession();
    })
    avatar.current?.on(StreamingEvents.STREAM_READY, (event) => {
      console.log(">>>>> Stream ready:", event.detail)
      setStream(event.detail)
    })
    avatar.current?.on(StreamingEvents.USER_START, (event) => {
      console.log(">>>>> User started talking:", event)
      setIsUserSpeaking(true);
    })
    avatar.current?.on(StreamingEvents.USER_STOP, (event) => {
      console.log(">>>>> User stopped talking:", event)
      setIsUserSpeaking(false);
    })
    //console.log("Avatar API initialized")
    //console.log("knowledgeBase:", knowledgeData)
    const res = await avatar.current.createStartAvatar({
      quality: quality, // low, medium, high
      avatarName: avatarId,
      //voice: { voiceId: voiceId },
      //knowledgeBase: knowledgeData,
      knowledgeId: '0be4beeadcec4a4ba62d8945d5da2007',
      voice: {
        voiceId: voiceId,
        rate: 1, // 0.5 ~ 1.5
        emotion: VoiceEmotion.EXCITED, // neutral, happy, angry, sad
      },
    })

    //setSessionData(res)
    //setStream(avatarRef.current.mediaStream)
    
    await avatar.current?.startVoiceChat();
    setSessionState("running")
  }

  async function stop() {
    setSessionState("stopped")
    setMediaStreamActive(false)
    await avatar.current?.stopAvatar();
    //setStream(undefined);
  }

  return (
    <div className="relative space-x-1">
      <div>
        {/* <button
          className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
          onClick={() => setDebug(debug + 1)}
        >
          Start session
        </button> */}
        {sessionState == "stopped" && (
          <Button onClick={grab} variant="purple" size="lg">
            <PlayIcon className="size-4" />
            Start Session
          </Button>
        )}

        {sessionState == "initializing" && (
          <Button onClick={grab} variant="purple" size="lg">
            <PlayIcon className="size-4" />
            Initializing...
          </Button>
        )}

        {sessionState == "running" && (
          <div className="flex gap-2">
            <div className="flex items-center justify-center rounded-3xl bg-[#7559ff] px-4 py-2 text-black text-white">
              {/* <MicIcon className="size-4" /> */}
              <Chat />
              <Button onClick={stop} variant="purple" size="icon">
                <SquareIcon className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
      {/* <Button onClick={grab} variant="ghost" size="icon">
        <PlayIcon className="size-4" />
      </Button>
      <Button onClick={stop} variant="ghost" size="icon">
        <SquareIcon className="size-4" />
      </Button>
      <Button onClick={stop} variant="ghost" size="icon">
        <RefreshCcw className="size-4" />
      </Button> */}
    </div>
  )
}
