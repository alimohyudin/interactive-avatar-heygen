import { RefObject, useEffect, useRef, useState } from "react"
import {
  Configuration,
  NewSessionData,
  StreamingAvatarApi,
  NewSessionRequestVoiceEmotionEnum
} from "@heygen/streaming-avatar"
import { useAtom } from "jotai"
import { MicIcon, PlayIcon, RefreshCcw, SquareIcon } from "lucide-react"

import {
  avatarAtom,
  avatarIdAtom,
  debugAtom,
  isAvatarSpeakingAtom,
  knowledgeBaseFileAtom,
  mediaCanvasRefAtom,
  mediaStreamActiveAtom,
  mediaStreamRefAtom,
  qualityAtom,
  sessionDataAtom,
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
  const [mediaStreamRef] = useAtom(mediaStreamRefAtom)
  const [mediaCanvasRef] = useAtom(mediaCanvasRefAtom)
  const [sessionData, setSessionData] = useAtom(sessionDataAtom) as [
    NewSessionData | undefined,
    (sessionData: NewSessionData | undefined) => void,
  ]
  const [stream, setStream] = useAtom(streamAtom) as [
    MediaStream | undefined,
    (stream: MediaStream | undefined) => void,
  ]
  const [, setDebug] = useAtom(debugAtom)

  const [avatar, setAvatar] = useAtom(avatarAtom) as [
    { current: StreamingAvatarApi | undefined },
    (value: { current: StreamingAvatarApi | undefined }) => void,
  ]
  const avatarRef = useRef<StreamingAvatarApi | undefined>()
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

    avatarRef.current = new StreamingAvatarApi(
      new Configuration({
        accessToken: data.data.data.token,
      })
    )

    let knowledgeData = ""
    if (knowledgeBaseFile) {
      //console.log("Reading knowledge base from file:", knowledgeBaseFile)
      knowledgeData = await readKnowledgeBaseFromFile()
    }

    //console.log("Avatar API initialized")
    //console.log("knowledgeBase:", knowledgeData)
    const res = await avatarRef.current.createStartAvatar(
      {
        newSessionRequest: {
          quality: quality, // low, medium, high
          avatarName: avatarId,
          //voice: { voiceId: voiceId },
          knowledgeBase: knowledgeData,
          voice: {
            voiceId: voiceId,
            rate: 1, // 0.5 ~ 1.5
            emotion: NewSessionRequestVoiceEmotionEnum.Excited,
          },
        },
      },
      setDebug
    )

    setSessionData(res)
    setStream(avatarRef.current.mediaStream)
    setSessionState("running")
  }

  async function stop() {
    setSessionState("stopped")
    setMediaStreamActive(false)
    await avatarRef.current!.stopAvatar(
      { stopSessionRequest: { sessionId: sessionData?.sessionId } },
      setDebug
    )
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
              <MicIcon className="size-4" />
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
