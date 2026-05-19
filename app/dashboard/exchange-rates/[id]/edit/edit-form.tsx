"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { editExchangeRateAction, getLiveReferenceRatesAction } from "../../actions"
import { useTransition, useEffect } from "react"

const roundToSixDecimals = (value: number) =>
  Math.round(value * 1000000) / 1000000
const roundToTwoDecimals = (value: number) => Math.round(value * 100) / 100

const toNumber = (value: unknown, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

const formSchema = z.object({
  id: z.coerce.number(),
  usdtToPhpReferenceRate: z.coerce.number(),
  usdtToPhpRate: z.coerce.number(),
  usdtToPhpSpread: z.coerce.number(),
  usdtToPhpSpreadPercentage: z.coerce.number(),
  usdtToPhpSpinzoFee: z.coerce.number(),
  usdtToPhpGicFee: z.coerce.number(),

  phpToUsdtReferenceRate: z.coerce.number(),
  phpToUsdtRate: z.coerce.number(),
  phpToUsdtSpread: z.coerce.number(),
  phpToUsdtSpreadPercentage: z.coerce.number(),
  phpToUsdtSpinzoFee: z.coerce.number(),
  phpToUsdtGicFee: z.coerce.number(),

  isActive: z.boolean(),
})

type FormData = z.infer<typeof formSchema>

export function EditExchangeRateForm({ rate }: { rate: any }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  console.log({ rate })

  const { register, handleSubmit, setValue, watch, getValues } = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      id: rate.id,
      usdtToPhpReferenceRate: toNumber(rate.usdtToPhpReferenceRate),
      usdtToPhpSpinzoFee: toNumber(rate.usdtToPhpSpinzoFee),
      usdtToPhpGicFee: toNumber(rate.usdtToPhpGicFee),
      usdtToPhpRate: toNumber(rate.usdtToPhpRate),
      usdtToPhpSpread: toNumber(rate.usdtToPhpSpread),
      usdtToPhpSpreadPercentage: toNumber(rate.usdtToPhpSpreadPercentage),

      phpToUsdtReferenceRate: toNumber(rate.phpToUsdtReferenceRate),
      phpToUsdtSpinzoFee: toNumber(rate.phpToUsdtSpinzoFee),
      phpToUsdtGicFee: toNumber(rate.phpToUsdtGicFee),
      phpToUsdtRate: toNumber(rate.phpToUsdtRate),
      phpToUsdtSpread: toNumber(rate.phpToUsdtSpread),
      phpToUsdtSpreadPercentage: toNumber(rate.phpToUsdtSpreadPercentage),

      isActive: rate.isActive,
    },
  })

  // Watch current values to display in UI
  const usdtToPhpReferenceRate = watch("usdtToPhpReferenceRate")
  const usdtToPhpSpinzoFee = watch("usdtToPhpSpinzoFee")
  const usdtToPhpGicFee = watch("usdtToPhpGicFee")
  const usdtToPhpRate = watch("usdtToPhpRate")
  const usdtToPhpSpread = watch("usdtToPhpSpread")
  const usdtToPhpSpreadPercentage = watch("usdtToPhpSpreadPercentage")

  const phpToUsdtReferenceRate = watch("phpToUsdtReferenceRate")
  const phpToUsdtSpinzoFee = watch("phpToUsdtSpinzoFee")
  const phpToUsdtGicFee = watch("phpToUsdtGicFee")
  const phpToUsdtRate = watch("phpToUsdtRate")
  const phpToUsdtSpread = watch("phpToUsdtSpread")
  const phpToUsdtSpreadPercentage = watch("phpToUsdtSpreadPercentage")

  console.log("current usdt to php rate", usdtToPhpRate)
  console.log("current php to usdt rate", phpToUsdtRate)

  const isActive = watch("isActive")

  // Handlers for USDT -> PHP
  // Handlers for USDT -> PHP
  const updateUsdtToPhpFromFees = (
    ref: number,
    spinzo: number,
    gic: number
  ) => {
    const calculatedRate = roundToSixDecimals(ref - spinzo - gic)
    const diff = Math.abs(ref - calculatedRate)
    setValue("usdtToPhpRate", calculatedRate, { shouldValidate: true })
    setValue("usdtToPhpSpread", roundToSixDecimals(diff), {
      shouldValidate: true,
    })
    setValue(
      "usdtToPhpSpreadPercentage",
      roundToTwoDecimals(ref > 0 ? (diff / ref) * 100 : 0),
      { shouldValidate: true }
    )
  }

  const updateUsdtToPhpFromRate = (
    ref: number,
    newRate: number,
    currentGic: number
  ) => {
    const spinzo = ref - newRate - currentGic
    const diff = Math.abs(ref - newRate)
    setValue("usdtToPhpSpinzoFee", roundToSixDecimals(spinzo), {
      shouldValidate: true,
    })
    setValue("usdtToPhpSpread", roundToSixDecimals(diff), {
      shouldValidate: true,
    })
    setValue(
      "usdtToPhpSpreadPercentage",
      roundToTwoDecimals(ref > 0 ? (diff / ref) * 100 : 0),
      { shouldValidate: true }
    )
  }

  // Handlers for PHP -> USDT
  const updatePhpToUsdtFromFees = (
    ref: number,
    spinzo: number,
    gic: number
  ) => {
    let rate = 0
    let diff = 0
    if (ref > 0) {
      const usdtToPhpRef = getValues("usdtToPhpReferenceRate") || (1 / ref)
      const spinzoRate = spinzo / (usdtToPhpRef * usdtToPhpRef)
      const gicRate = gic / (usdtToPhpRef * usdtToPhpRef)
      rate = roundToSixDecimals(ref - spinzoRate - gicRate)
      diff = Math.abs(ref - rate)
    }

    setValue("phpToUsdtRate", rate, { shouldValidate: true })
    setValue("phpToUsdtSpread", roundToSixDecimals(diff), {
      shouldValidate: true,
    })
    setValue(
      "phpToUsdtSpreadPercentage",
      roundToTwoDecimals(ref > 0 ? (diff / ref) * 100 : 0),
      { shouldValidate: true }
    )
  }

  const updatePhpToUsdtFromRate = (
    ref: number,
    rate: number,
    currentGic: number
  ) => {
    const diff = Math.abs(ref - rate)
    let spinzo = 0
    if (ref > 0) {
      const usdtToPhpRef = getValues("usdtToPhpReferenceRate") || (1 / ref)
      const totalFee = diff * (usdtToPhpRef * usdtToPhpRef)
      spinzo = totalFee - currentGic
    }

    setValue("phpToUsdtSpinzoFee", roundToTwoDecimals(spinzo), {
      shouldValidate: true,
    })
    setValue("phpToUsdtSpread", roundToSixDecimals(diff), {
      shouldValidate: true,
    })
    setValue(
      "phpToUsdtSpreadPercentage",
      roundToTwoDecimals(ref > 0 ? (diff / ref) * 100 : 0),
      {
        shouldValidate: true,
      }
    )
  }

  // Fetch live reference rates on mount
  useEffect(() => {
    const fetchRates = async () => {
      const res = await getLiveReferenceRatesAction()
      if (res.success && res.data) {
        setValue("usdtToPhpReferenceRate", res.data.usdtToPhpReferenceRate, {
          shouldValidate: true,
        })
        setValue("phpToUsdtReferenceRate", res.data.phpToUsdtReferenceRate, {
          shouldValidate: true,
        })

        // Also update the dependent fields (rates, spread) based on current fees
        const currentUsdtToPhpSpinzo = getValues("usdtToPhpSpinzoFee") || 0
        const currentUsdtToPhpGic = getValues("usdtToPhpGicFee") || 0
        updateUsdtToPhpFromFees(
          res.data.usdtToPhpReferenceRate,
          currentUsdtToPhpSpinzo,
          currentUsdtToPhpGic
        )

        const currentPhpToUsdtSpinzo = getValues("phpToUsdtSpinzoFee") || 0
        const currentPhpToUsdtGic = getValues("phpToUsdtGicFee") || 0
        updatePhpToUsdtFromFees(
          res.data.phpToUsdtReferenceRate,
          currentPhpToUsdtSpinzo,
          currentPhpToUsdtGic
        )
      } else {
        toast.error("Failed to fetch live reference rates")
      }
    }
    fetchRates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append("id", data.id.toString())
      formData.append(
        "usdtToPhpReferenceRate",
        data.usdtToPhpReferenceRate.toString()
      )
      formData.append("usdtToPhpRate", data.usdtToPhpRate.toString())
      formData.append("usdtToPhpSpinzoFee", data.usdtToPhpSpinzoFee.toString())
      formData.append("usdtToPhpGicFee", data.usdtToPhpGicFee.toString())
      formData.append("usdtToPhpSpread", data.usdtToPhpSpread.toString())
      formData.append(
        "usdtToPhpSpreadPercentage",
        data.usdtToPhpSpreadPercentage.toString()
      )
      formData.append(
        "phpToUsdtReferenceRate",
        data.phpToUsdtReferenceRate.toString()
      )
      formData.append("phpToUsdtRate", data.phpToUsdtRate.toString())
      formData.append("phpToUsdtSpinzoFee", data.phpToUsdtSpinzoFee.toString())
      formData.append("phpToUsdtGicFee", data.phpToUsdtGicFee.toString())
      formData.append("phpToUsdtSpread", data.phpToUsdtSpread.toString())
      formData.append(
        "phpToUsdtSpreadPercentage",
        data.phpToUsdtSpreadPercentage.toString()
      )
      formData.append("isActive", data.isActive ? "on" : "off")

      const res = editExchangeRateAction(null, formData)

      toast.promise(res, {
        loading: "Updating exchange rate...",
        success: (data) => {
          if (data.success) {
            router.push("/dashboard/exchange-rates")
          }
          return data.message
        },
        error: (data) => data.message || "Failed to update exchange rate",
      })
    })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-1 flex-col text-[#ededed]"
    >
      {/* Sub Header */}
      <div className="mb-8 flex items-center justify-between border-b border-[#282828] pb-4">
        <div className="flex gap-4 text-xs text-[#4e4e4e]">
          <span>Draft configuration</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="submit"
            disabled={isPending}
            className="h-8 border border-[#282828] bg-[#1e1e1e] px-4 text-[#ededed] hover:bg-[#2a2a2a]"
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="flex max-w-[1000px] flex-col gap-8">
        {/* Currency Pair */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-[#ededed]">
            Currency Pair <span className="text-red-500">*</span>
          </Label>
          <Input
            disabled
            value="USDT/PHP"
            className="w-full border-[#282828] bg-[#1e1e1e] text-[#4e4e4e]"
          />
          <p className="text-xs text-[#4e4e4e]">
            Fixed pair for this exchange rate configuration.
          </p>
        </div>

        {/* USDT -> PHP Pricing */}
        <div className="relative flex flex-col gap-6 rounded-lg border border-[#282828] bg-[#121212] p-6">
          <div className="absolute -top-3 left-6 flex items-center gap-2 bg-[#121212] px-2">
            <span className="text-xs font-semibold tracking-wider text-[#4e4e4e]">
              USDT → PHP PRICING
            </span>
            <span className="rounded bg-[#003b5c] px-2 py-0.5 text-[10px] font-bold text-[#4da6ff]">
              REF: {usdtToPhpReferenceRate}
            </span>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-sm text-[#ededed]">
                Reference Rate (1 USDT = ? PHP)
              </Label>
              <Input
                type="number"
                step="any"
                className="border-[#282828] bg-[#121212]"
                {...register("usdtToPhpReferenceRate", {
                  onChange: (e) => {
                    const val = Number(e.target.value)
                    updateUsdtToPhpFromFees(
                      val,
                      usdtToPhpSpinzoFee,
                      usdtToPhpGicFee
                    )
                  },
                })}
              />
              <p className="text-xs text-[#4e4e4e]">
                Original market/reference for this ramp
              </p>
            </div>

            <div className="mt-8 flex items-center justify-center text-[#4e4e4e]">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[#282828] bg-[#1e1e1e]">
                <HugeiconsIcon icon={ArrowRight02Icon} size={14} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm text-[#ededed]">
                Rate (1 USDT = ? PHP)
              </Label>
              <Input
                type="number"
                step="any"
                className="border-[#282828] bg-[#121212]"
                {...register("usdtToPhpRate", {
                  onChange: (e) => {
                    const val = Number(e.target.value)
                    updateUsdtToPhpFromRate(
                      usdtToPhpReferenceRate,
                      val,
                      usdtToPhpGicFee
                    )
                  },
                })}
              />
              <p className="text-xs text-[#4e4e4e]">
                PHP received per USDT sold
              </p>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-start gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-sm text-[#ededed]">Spinzo Fee (PHP)</Label>
              <Input
                type="number"
                step="any"
                className="border-[#282828] bg-[#121212]"
                {...register("usdtToPhpSpinzoFee", {
                  onChange: (e) => {
                    const val = Number(e.target.value)
                    updateUsdtToPhpFromFees(
                      usdtToPhpReferenceRate,
                      val,
                      usdtToPhpGicFee
                    )
                  },
                })}
              />
            </div>

            <div className="mt-8 flex items-center justify-center font-medium text-[#4e4e4e]">
              +
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm text-[#ededed]">GIC Fee (PHP)</Label>
              <Input
                type="number"
                step="any"
                className="border-[#282828] bg-[#121212]"
                {...register("usdtToPhpGicFee", {
                  onChange: (e) => {
                    const val = Number(e.target.value)
                    updateUsdtToPhpFromFees(
                      usdtToPhpReferenceRate,
                      usdtToPhpSpinzoFee,
                      val
                    )
                  },
                })}
              />
            </div>

            <div className="mt-8 flex items-center justify-center text-[#4e4e4e]">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[#282828] bg-[#1e1e1e]">
                <HugeiconsIcon icon={ArrowRight02Icon} size={14} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-[#4e4e4e]">
                  Profit / Spread (PHP)
                </Label>
                <div className="flex h-10 items-center rounded-md border border-[#282828] bg-[#121212] px-3">
                  <span className="font-medium text-[#ededed]">
                    {usdtToPhpSpread}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-[#4e4e4e]">Spread (%)</Label>
                <div className="flex h-10 items-center rounded-md border border-[#282828] bg-[#121212] px-3">
                  <span className="font-medium text-[#ededed]">
                    {usdtToPhpSpreadPercentage}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PHP -> USDT Pricing */}
        <div className="relative mt-2 flex flex-col gap-6 rounded-lg border border-[#282828] bg-[#121212] p-6">
          <div className="absolute -top-3 left-6 flex items-center gap-2 bg-[#121212] px-2">
            <span className="text-xs font-semibold tracking-wider text-[#4e4e4e]">
              PHP → USDT PRICING
            </span>
            <span className="rounded bg-[#003b5c] px-2 py-0.5 text-[10px] font-bold text-[#4da6ff]">
              REF: {phpToUsdtReferenceRate}
            </span>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-sm text-[#ededed]">
                Reference Rate (1 PHP = ? USDT)
              </Label>
              <Input
                type="number"
                step="any"
                className="border-[#282828] bg-[#121212]"
                {...register("phpToUsdtReferenceRate", {
                  onChange: (e) => {
                    const val = Number(e.target.value)
                    updatePhpToUsdtFromFees(
                      val,
                      phpToUsdtSpinzoFee,
                      phpToUsdtGicFee
                    )
                  },
                })}
              />
              <p className="text-xs text-[#4e4e4e]">
                Original market/reference for this ramp
              </p>
            </div>

            <div className="mt-8 flex items-center justify-center text-[#4e4e4e]">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[#282828] bg-[#1e1e1e]">
                <HugeiconsIcon icon={ArrowRight02Icon} size={14} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm text-[#ededed]">
                Rate (1 PHP = ? USDT)
              </Label>
              <Input
                type="number"
                step="any"
                className="border-[#282828] bg-[#121212]"
                {...register("phpToUsdtRate", {
                  onChange: (e) => {
                    const val = Number(e.target.value)
                    updatePhpToUsdtFromRate(
                      phpToUsdtReferenceRate,
                      val,
                      phpToUsdtGicFee
                    )
                  },
                })}
              />
              <p className="text-xs text-[#4e4e4e]">
                USDT received per PHP spent
              </p>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-start gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-sm text-[#ededed]">Spinzo Fee</Label>
              <Input
                type="number"
                step="any"
                className="border-[#282828] bg-[#121212]"
                {...register("phpToUsdtSpinzoFee", {
                  onChange: (e) => {
                    const val = Number(e.target.value)
                    updatePhpToUsdtFromFees(
                      phpToUsdtReferenceRate,
                      val,
                      phpToUsdtGicFee
                    )
                  },
                })}
              />
            </div>

            <div className="mt-8 flex items-center justify-center font-medium text-[#4e4e4e]">
              +
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm text-[#ededed]">GIC Fee</Label>
              <Input
                type="number"
                step="any"
                className="border-[#282828] bg-[#121212]"
                {...register("phpToUsdtGicFee", {
                  onChange: (e) => {
                    const val = Number(e.target.value)
                    updatePhpToUsdtFromFees(
                      phpToUsdtReferenceRate,
                      phpToUsdtSpinzoFee,
                      val
                    )
                  },
                })}
              />
            </div>

            <div className="mt-8 flex items-center justify-center text-[#4e4e4e]">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[#282828] bg-[#1e1e1e]">
                <HugeiconsIcon icon={ArrowRight02Icon} size={14} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-[#4e4e4e]">
                  Profit / Spread (USDT)
                </Label>
                <div className="flex h-10 items-center rounded-md border border-[#282828] bg-[#121212] px-3">
                  <span className="font-medium text-[#ededed]">
                    {phpToUsdtSpread}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-[#4e4e4e]">Spread (%)</Label>
                <div className="flex h-10 items-center rounded-md border border-[#282828] bg-[#121212] px-3">
                  <span className="font-medium text-[#ededed]">
                    {phpToUsdtSpreadPercentage}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Toggle */}
        <div className="mt-2 flex items-center space-x-2 pb-8">
          <Checkbox
            id="active"
            checked={isActive}
            onCheckedChange={(checked) =>
              setValue("isActive", checked as boolean)
            }
            className="border-[#282828] data-[state=checked]:border-[#83b047] data-[state=checked]:bg-[#83b047]"
          />
          <Label
            htmlFor="active"
            className="cursor-pointer text-sm font-medium text-[#ededed]"
          >
            Active
          </Label>
        </div>
      </div>
    </form>
  )
}
