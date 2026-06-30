"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineChart, ChartContainer } from "@/components/ui/charts"
import {
  CircleCheck,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Percent,
  Brain,
  Download,
  ChevronRight,
  ArrowLeft,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import type { ApplicationResponse } from "@/lib/api"
import { formatKES } from "@/lib/format"

function monthlyPayment(principal: number, apr: number, months: number): number {
  const r = apr / 100 / 12
  if (!principal || !months) return 0
  if (r === 0) return principal / months
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
}

function buildRecommendations(application?: ApplicationResponse | null) {
  if (!application) return []
  const items: { icon: "check" | "alert"; title: string; text: string }[] = []
  const dti = application.debtToIncome ?? 0
  const score = application.aiCreditScore ?? application.existingCreditScore ?? 0
  const rec = application.aiRecommendation ?? application.scoring?.recommendation

  if (dti > 0.4) {
    items.push({
      icon: "alert",
      title: "High debt-to-income ratio",
      text: `Your DTI is ${(dti * 100).toFixed(0)}%. Paying down existing debt could improve approval odds and rates.`,
    })
  }
  if (score > 0 && score < 650) {
    items.push({
      icon: "alert",
      title: "Build credit score",
      text: `Your score of ${score} is below our preferred range. On-time M-Pesa and utility payments help alternative scoring.`,
    })
  }
  if (rec === "REVIEW") {
    items.push({
      icon: "alert",
      title: "Manual review recommended",
      text: "Our AI flagged this application for institution review. An officer may contact you for additional documents.",
    })
  }
  if (application.termMonths && application.termMonths > 48) {
    items.push({
      icon: "check",
      title: "Consider a shorter term",
      text: `A term under 48 months may reduce total interest on your ${formatKES(application.amount)} loan.`,
    })
  }
  if (items.length === 0) {
    items.push({
      icon: "check",
      title: "Strong application profile",
      text: application.aiSummary || "Your financial signals are within Credora's lending guidelines.",
    })
  }
  return items
}

interface AIInsightsProps {
  application?: ApplicationResponse | null
  onBack?: () => void
}

export default function AIInsights({ application, onBack }: AIInsightsProps) {
  const scoring = application?.scoring
  const approvalPct = Math.round((application?.approvalProbability ?? scoring?.approvalProbability ?? 0) * 100)
  const creditScore = application?.aiCreditScore ?? scoring?.creditScore ?? 0
  const recommended = application?.recommendedAmount ?? scoring?.recommendedAmount ?? Number(application?.amount ?? 0)
  const apr = application?.estimatedApr ?? scoring?.estimatedApr ?? 0
  const summary = application?.aiSummary ?? scoring?.summary ?? "AI assessment will appear after scoring completes."
  const termMonths = application?.termMonths ?? 60
  const monthly = monthlyPayment(Number(recommended), apr, termMonths)
  const incomePct = application?.monthlyIncome
    ? Math.round((monthly / Number(application.monthlyIncome)) * 100)
    : null

  const successPredictionData = (scoring?.factors?.length ? scoring.factors : application?.scoring?.factors ?? []).map((f) => ({
    name: f.name,
    value: f.value,
  }))

  const loanAmountRecommendationData = (scoring?.amountOptions?.length ? scoring.amountOptions : []).map((o) => ({
    name: o.name,
    value: o.value,
  }))

  const factorCards = successPredictionData.length > 0 ? successPredictionData : []
  const recommendations = buildRecommendations(application)

  const isApproved = application?.status === "approved"
  const isRejected = application?.status === "rejected"

  return (    
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
        <Card className="bg-gradient-to-r from-[#0a1525] to-[#1a2b45] text-white border-none">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h2 className="text-2xl font-bold">
                  {application?.loanType ? `${application.loanType.charAt(0).toUpperCase()}${application.loanType.slice(1)} Loan` : "Loan"} Results
                </h2>
                <p className="mt-1 text-blue-100">
                  {isApproved ? "Congratulations! Your application was approved." :
                   isRejected ? "Your application requires review." :
                   "Our AI has analyzed your application and provided personalized insights"}
                </p>
                {application?.referenceId && (
                  <p className="text-xs text-blue-200 mt-2">Ref: {application.referenceId}</p>
                )}
              </div>
              <div className="mt-4 md:mt-0 flex space-x-2">
                <Button className="bg-white text-[#0a1525] hover:bg-blue-100">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="success">Success Prediction</TabsTrigger>
            <TabsTrigger value="amount">Loan Amount</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <CircleCheck className="h-5 w-5 mr-2 text-green-500" />
                    Application Success
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-500">{approvalPct}%</div>
                  <p className="text-sm text-gray-500 mt-1">Probability of approval</p>
                  <Progress value={approvalPct} className="h-2 mt-4" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <DollarSign className="h-5 w-5 mr-2 text-blue-500" />
                    Recommended Loan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatKES(recommended)}</div>
                  <p className="text-sm text-gray-500 mt-1">Based on your income</p>
                  <div className="flex items-center mt-4 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                    <span className="text-green-500 font-medium">Optimal amount for your profile</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Percent className="h-5 w-5 mr-2 text-purple-500" />
                    Interest Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{apr}%</div>
                  <p className="text-sm text-gray-500 mt-1">Estimated APR</p>
                  <div className="flex items-center mt-4 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                    <span className="text-blue-500 font-medium">
                      {apr > 0 ? `Estimated APR ${apr}%` : "APR pending scoring"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>AI Summary</CardTitle>
                <CardDescription>Based on our analysis of your application data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <Brain className="h-5 w-5 mr-3 text-purple-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Overall Assessment</h4>
                      <p className="text-gray-600 mt-1">{summary}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <TrendingUp className="h-5 w-5 mr-3 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Strengths</h4>
                      <p className="text-gray-600 mt-1">
                        Credit score {creditScore || "—"} · Approval probability {approvalPct}% · AI recommendation:{" "}
                        {application?.aiRecommendation ?? scoring?.recommendation ?? "PENDING"}.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 mr-3 text-amber-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Areas for Improvement</h4>
                      <p className="text-gray-600 mt-1">
                        {application?.debtToIncome
                          ? `Debt-to-income is ${(application.debtToIncome * 100).toFixed(0)}%.`
                          : "Alternative data (M-Pesa, utilities) supplements traditional credit signals."}
                        {incomePct ? ` Estimated payment is ${incomePct}% of monthly income.` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-between">
                <Button variant="outline" onClick={() => onBack?.()}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Application
                </Button>
                <Button className="bg-[#0a1525] hover:bg-[#1a2b45]">
                  Submit Application
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="success">
            <Card>
              <CardHeader>
                <CardTitle>Success Prediction Analysis</CardTitle>
                <CardDescription>
                  Detailed breakdown of factors affecting your loan approval probability
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] mb-6">
                  <ChartContainer>
                    <LineChart
                      data={successPredictionData}
                      categories={["value"]}
                      colors={["#6366f1"]}
                      valueFormatter={(value) => `${value}%`}
                      showLegend={false}
                      showXAxis
                      showYAxis
                    />
                  </ChartContainer>
                </div>

                <div className="space-y-4">
                  {factorCards.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {factorCards.map((factor) => (
                        <div key={factor.name} className="border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <div className="font-medium">{factor.name}</div>
                            <div className="text-green-500 font-medium">{factor.value}%</div>
                          </div>
                          <Progress value={factor.value} className="h-2" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Factor breakdown available after AI scoring completes.</p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button className="w-full bg-[#0a1525] hover:bg-[#1a2b45]">Submit Application</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="amount">
            <Card>
              <CardHeader>
                <CardTitle>Loan Amount Recommendation</CardTitle>
                <CardDescription>Analysis of optimal loan amount based on your financial profile</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] mb-6">
                  <ChartContainer>
                    <LineChart
                      data={loanAmountRecommendationData}
                      categories={["value"]}
                      colors={["#10b981"]}
                      valueFormatter={(value) => `${value}%`}
                      showLegend={false}
                      showXAxis
                      showYAxis
                    />
                  </ChartContainer>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium text-lg mb-2">Optimal Loan Amount</h3>
                    <div className="text-3xl font-bold text-green-500">{formatKES(recommended)}</div>
                    <p className="text-sm text-gray-500 mt-2">
                      AI-recommended amount based on income, alternative data, and {application?.loanType ?? "loan"} profile.
                    </p>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium text-lg mb-2">Monthly Payment</h3>
                    <div className="text-3xl font-bold">{formatKES(monthly)}</div>
                    <p className="text-sm text-gray-500 mt-2">
                      Estimated for {formatKES(recommended)} at {apr}% APR over {termMonths} months.
                      {incomePct ? ` About ${incomePct}% of monthly income.` : ""}
                    </p>
                  </div>
                </div>

                {loanAmountRecommendationData.length > 0 && (
                <div className="mt-6 border rounded-lg p-4">
                  <h3 className="font-medium text-lg mb-2">Amount Fit Analysis</h3>
                  <div className="space-y-3">
                    {loanAmountRecommendationData.slice(0, 5).map((opt) => (
                      <div key={opt.name} className="flex items-center justify-between">
                        <span>{opt.name}</span>
                        <span className="font-medium">{opt.value}% fit</span>
                      </div>
                    ))}
                  </div>
                </div>
                )}
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button className="w-full bg-[#0a1525] hover:bg-[#1a2b45]" onClick={() => onBack?.()}>
                  Back to Application
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations">
            <Card>
              <CardHeader>
                <CardTitle>AI Recommendations</CardTitle>
                <CardDescription>Personalized recommendations to improve your loan application</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {recommendations.map((rec, i) => (
                    <div key={i} className="border rounded-lg p-4">
                      <div className="flex items-start">
                        {rec.icon === "check" ? (
                          <CircleCheck className="h-5 w-5 mr-3 text-green-500 mt-0.5" />
                        ) : (
                          <AlertCircle className="h-5 w-5 mr-3 text-amber-500 mt-0.5" />
                        )}
                        <div>
                          <h4 className="font-medium">{rec.title}</h4>
                          <p className="text-gray-600 mt-1">{rec.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-between">
                <Button variant="outline" onClick={() => onBack?.()}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Modify Application
                </Button>
                <Button className="bg-[#0a1525] hover:bg-[#1a2b45]">Submit Application</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    
  )
}

