import { useClickOutside } from "@/hooks/use-click-outside"
import { type IConversationOptions } from "@/models/feed-store"
import { useRef } from "react"


interface ConversationSettingEditorProps {
  options: Partial<IConversationOptions>
  onClose: () => void
  onChange: (config: Partial<IConversationOptions>) => void
}
export const ConversationSettingEditor = ({ options, onChange, onClose }: ConversationSettingEditorProps) => {
  const ref = useRef<HTMLDivElement | null>(null)
  useClickOutside(ref, onClose)

  if(!options) {
    return null
  }

  return <div
    ref={ref}
    className="absolute bottom-14 right-0 z-50 bg-base-100 p-4 rounded-lg shadow-xl w-80"
    onClick={(e) => e.stopPropagation()}
  >
    <div className="flex justify-between items-center mb-2">
      <h3 className="text-md font-bold">Edit Settings</h3>
    </div>

    <div className="form-control w-full flex flex-col space-y-2">
      <div>
        <label>temperature(range 0,2):</label>
        <input type="number" min="0" max="2" value={options.temperature} className="input input-sm" onChange={(e) => {
          const temperature = parseFloat(e.target.value)
          onChange({temperature: Number.isFinite(temperature) ? temperature : 0})
        }} />
      </div>
      <div>
        <label>seed: {options.seed}</label>
        <input type="range" min="0" max={2 ** 31 - 1} value={options.seed} className="range range-sm" onChange={(e) => {
          onChange({seed: parseInt(e.target.value, 10)})
        }} />
      </div>

      <div>
        <label>max token: {options.maxToken}</label>
        <input type="number" min="0" max={100000000} value={options.maxToken || 0} className="input input-sm" onChange={(e) => {
          const maxToken = parseInt(e.target.value, 10)
          onChange({maxToken: Number.isFinite(maxToken) ? maxToken : 0})
        }} />
      </div>
    </div>
  </div>
}