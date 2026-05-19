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
import { useEffect } from "react"
import { z } from "zod"
import { getLiveReferenceRatesAction } from "../actions"
const roundToSixDecimals = (value: number) =>
  Math.round(value * 1000000) / 1000000
const roundToTwoDecimals = (value: number) => Math.round(value * 100) / 100

const formSchema = z.object({
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

export default function CreateExchangeRatePage() {
  const router = useRouter()
  // const

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      usdtToPhpReferenceRate: 60.04,
      usdtToPhpSpinzoFee: 0.23,
      usdtToPhpGicFee: 0,
      usdtToPhpRate: 59.9,
      usdtToPhpSpread: 0.14,
      usdtToPhpSpreadPercentage: 0.23,

      phpToUsdtReferenceRate: 0.01669,
      phpToUsdtSpinzoFee: 1,
      phpToUsdtGicFee: 0,
      phpToUsdtRate: 0.016523,
      phpToUsdtSpread: 0.000167,
      phpToUsdtSpreadPercentage: 1,

      isActive: true,
    },
  })

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
        // This simulates the user typing in the reference rate manually
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

  // Watch current values to display in UI
  const usdtToPhpReferenceRate = watch("usdtToPhpReferenceRate")
  const usdtToPhpSpinzoFee = watch("usdtToPhpSpinzoFee")
  const usdtToPhpGicFee = watch("usdtToPhpGicFee")

  const usdtToPhpSpread = watch("usdtToPhpSpread")
  const usdtToPhpSpreadPercentage = watch("usdtToPhpSpreadPercentage")

  const phpToUsdtReferenceRate = watch("phpToUsdtReferenceRate")
  const phpToUsdtSpinzoFee = watch("phpToUsdtSpinzoFee")
  const phpToUsdtGicFee = watch("phpToUsdtGicFee")

  const phpToUsdtSpread = watch("phpToUsdtSpread")
  const phpToUsdtSpreadPercentage = watch("phpToUsdtSpreadPercentage")

  const isActive = watch("isActive")

  // Handlers for USDT -> PHP
  // Handlers for USDT -> PHP
  const updateUsdtToPhpFromFees = (
    ref: number,
    spinzo: number,
    gic: number
  ) => {
    const rate = roundToSixDecimals(ref - spinzo - gic)
    const diff = Math.abs(ref - rate)
    setValue("usdtToPhpRate", rate, { shouldValidate: true })
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
    rate: number,
    currentGic: number
  ) => {
    const spinzo = ref - rate - currentGic
    const diff = Math.abs(ref - rate)
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

  const onSubmit = async (data: FormData) => {
    try {
      // Create payload that matches our ManualRates interface
      const payload = {
        usdtToPhpReferenceRate: data.usdtToPhpReferenceRate,
        usdtToPhpRate: data.usdtToPhpRate,
        usdtToPhpSpinzoFee: data.usdtToPhpSpinzoFee,
        usdtToPhpGicFee: data.usdtToPhpGicFee,
        usdtToPhpSpread: data.usdtToPhpSpread,
        usdtToPhpSpreadPercentage: data.usdtToPhpSpreadPercentage,
        phpToUsdtReferenceRate: data.phpToUsdtReferenceRate,
        phpToUsdtRate: data.phpToUsdtRate,
        phpToUsdtSpinzoFee: data.phpToUsdtSpinzoFee,
        phpToUsdtGicFee: data.phpToUsdtGicFee,
        phpToUsdtSpread: data.phpToUsdtSpread,
        phpToUsdtSpreadPercentage: data.phpToUsdtSpreadPercentage,
        isActive: data.isActive,
      }

      const res = await fetch("/api/exchange-rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await res.json()
      if (result.success) {
        toast.success("Exchange rate created successfully")
        router.push("/dashboard/exchange-rates")
      } else {
        toast.error(result.message || "Failed to create exchange rate")
      }
    } catch (e) {
      toast.error("An error occurred")
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-1 flex-col p-8 text-[#ededed]"
    >
      {/* Sub Header */}
      <div className="mb-8 flex items-center justify-between border-b border-[#282828] pb-4">
        <div className="flex gap-4 text-xs text-[#4e4e4e]">
          <span>Draft configuration</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-8 border border-[#282828] bg-[#1e1e1e] px-4 text-[#ededed] hover:bg-[#2a2a2a]"
          >
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex h-8 w-8 items-center justify-center border-[#282828] bg-[#1e1e1e] p-0"
          >
            &#8942;
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
              <Label className="text-sm text-[#ededed]">GIC Fee </Label>
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
