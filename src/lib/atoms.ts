import { RefObject } from "react"
import StreamingAvatar, {
  AvatarQuality
} from "@heygen/streaming-avatar"
import { atom } from "jotai"

import { NavItem } from "./types"

//Stream Atoms
export const mediaStreamActiveAtom = atom<Boolean>(false)
export const streamAtom = atom<MediaStream | undefined>(undefined)
export const debugAtom = atom<string>("")
export const inputTextAtom = atom<string>("")
export const avatarIdAtom = atom<string>("")
export const voiceIdAtom = atom<string>("1bd001e7e50f421d891986aad5158bc8")
export const qualityAtom = atom<AvatarQuality>(AvatarQuality.High)
export const knowledgeBaseFileAtom = atom<string>("/knowledge/first-knowledge.txt")
export const isUserSpeakingAtom = atom(false)
export const isAvatarSpeakingAtom = atom(true)
export const mediaStreamRefAtom = atom<RefObject<HTMLVideoElement> | null>(null)
export const mediaCanvasRefAtom = atom<RefObject<HTMLCanvasElement> | null>(
  null
)
export const avatarAtom = atom<RefObject<StreamingAvatar> | undefined>(
  undefined
)

//UI Atoms
export const selectedNavItemAtom = atom<NavItem>({
  label: "Playground",
  icon: "",
  ariaLabel: "Playground",
  content: "",
})
export const publicAvatarsAtom = atom([])
export const removeBGAtom = atom(true)
export const isRecordingAtom = atom(false)
export const chatModeAtom = atom(true)
export const customBgPicAtom = atom<string>("/images/bg-3.jpg")

//LLMs Atoms
export const providerModelAtom = atom("openai:gpt-4-turbo")
export const temperatureAtom = atom(1)
export const maxTokensAtom = atom(256)
