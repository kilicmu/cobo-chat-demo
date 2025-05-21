import { useMemoizedFn } from "ahooks"
import { useEffect } from "react"

export const useClickOutside = (ref?: React.MutableRefObject<HTMLDivElement | null>, callback?: () => void) => {
    const listener = useMemoizedFn((e: Event) => {
        let t = e.target as HTMLElement | null
        let isInContainer = false
        while (t) {
            if (!ref) {
                callback?.()
                return
            }
            if (t === ref.current) {
                isInContainer = true
                break
            }
            t = t.parentElement
        }

        if (!isInContainer) {
            callback?.()
        }
    })


    useEffect(() => {
        document.addEventListener('click', listener, { capture: true })
        return () => {
            document.removeEventListener('click', listener, { capture: true })
        }
    }, [callback, listener])
}