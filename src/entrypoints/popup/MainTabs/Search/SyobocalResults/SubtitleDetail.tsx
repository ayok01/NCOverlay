import type { StateSlotDetailJikkyo } from '@/ncoverlay/state'
import type { ScSubtitleItem } from './SubtitleItems'
import type { ScTitleItem } from './TitleItem'

import { useImperativeHandle, useState } from 'react'
import { Spinner } from '@heroui/react'

import { SYOBOCAL_CHANNEL_IDS } from '@/constants/channels'
import { programToSlotDetail } from '@/utils/api/syobocal/programToSlotDetail'
import { useNcoState } from '@/hooks/useNco'
import { ncoApiProxy } from '@/proxy/nco-utils/api/extension'

import { SlotItem } from '@/components/SlotItem'

export interface SubtitleDetailHandle {
  initialize: () => void
}

export interface SubtitleDetailProps {
  title: ScTitleItem
  subtitle: ScSubtitleItem
  ref: React.Ref<SubtitleDetailHandle>
}

export function SubtitleDetail({ title, subtitle, ref }: SubtitleDetailProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [programItems, setProgramItems] = useState<StateSlotDetailJikkyo[]>([])

  const stateSlotDetails = useNcoState('slotDetails')

  const ids = stateSlotDetails?.map((v) => v.id) ?? []

  async function initialize() {
    if (isInitialized) return

    setIsInitialized(true)
    setIsLoading(true)
    setProgramItems([])

    const response = await ncoApiProxy.syobocal.db('ProgLookup', {
      TID: title.TID,
      Count: Number(subtitle[0]),
      ChID: SYOBOCAL_CHANNEL_IDS,
    })

    if (response) {
      const currentDateTime = new Date().getTime()
      const slotTitle = [title.Title, `#${Number(subtitle[0])}`, subtitle[1]]
        .filter(Boolean)
        .join(' ')
        .trim()

      const programs = Object.values(response)
      const programItems = programs
        .map((program) => ({
          ...program,
          _StDateTime: new Date(program.StTime).getTime(),
          _EdDateTime: new Date(program.EdTime).getTime(),
        }))
        .filter((program) => program._EdDateTime <= currentDateTime)
        .sort((a, b) => a._StDateTime - b._StDateTime)
        .map((program) => programToSlotDetail(slotTitle, program))

      setProgramItems(programItems)
    }

    setIsLoading(false)
  }

  useImperativeHandle(ref, () => {
    return { initialize }
  }, [initialize])

  return isLoading || !programItems.length ? (
    <div className="flex size-full items-center justify-center py-1">
      {isLoading ? (
        <Spinner size="sm" color="primary" />
      ) : (
        <span className="my-0.5 text-foreground-500 text-tiny">
          放送時間がありません
        </span>
      )}
    </div>
  ) : (
    <div className="flex min-h-7 flex-col gap-1.5">
      {programItems.map((detail) => (
        <SlotItem
          key={detail.id}
          detail={detail}
          isSearch
          isDisabled={ids.includes(detail.id)}
        />
      ))}
    </div>
  )
}
