import { cn } from "@/lib/utils"

import { Chat } from "./controls/chat"
import MediaPlayer from "./media-player"
import { Badge } from "./ui/badge"

export function Dashboard() {

  return (
    <div className="grid h-screen w-full pl-[53px]">
      <div className="flex flex-col">
        <main className="grid flex-1 gap-4 overflow-auto p-4 md:grid-cols-2 lg:grid-cols-3">
          <div
            className={cn(
              "relative flex h-full min-h-[50vh] flex-col rounded-xl bg-repeating-radial-light p-4 [background-size:20px_20px] dark:bg-repeating-radial-dark lg:col-span-2"
            )}
          >
            <div className="flex-1">
              <MediaPlayer />
            </div>
            <Chat />
          </div>
        </main>
      </div>
    </div>
  )
}
