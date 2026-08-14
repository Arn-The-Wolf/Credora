import { NextRequest, NextResponse } from "next/server";
import {
  STRONG_PASSWORD,
  hashPassword,
  signToken,
  verifyPassword,
  verifyToken,
  type JwtPayload,
} from "@/lib/credora-jwt";
import {
  getStore,
  scoreApplication,
  toInstitutionResponse,
  toUserResponse,
  type StoredApplication,
} from "@/lib/credora-store";

export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function auth(req: NextRequest): JwtPayload | null {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  return verifyToken(token);
}

function requireApplicant(req: NextRequest) {
  const payload = auth(req);
  if (!payload || payload.role !== "APPLICANT") return null;
  return payload;
}

function requireInstitution(req: NextRequest) {
  const payload = auth(req);
  if (!payload || payload.role !== "INSTITUTION") return null;
  return payload;
}

async function handle(req: NextRequest, path: string[]) {
  const route = "/" + path.join("/");
  const method = req.method;
  const store = getStore();
  let body: Record<string, unknown> = {};
  if (method !== "GET" && method !== "HEAD") {
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }
  }

  if (route === "/health") {
    return json({ status: "UP" });
  }

  if (route === "/auth/signup" && method === "POST") {
    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");
    if (!body.fullName || !email || !password) {
      return json({ message: "Name, email, and password are required" }, 400);
    }
    if (!STRONG_PASSWORD.test(password)) {
      return json(
        { message: "Password must be 10+ chars with upper, lower, digit, and special character" },
        400
      );
    }
    if (body.acceptTerms !== true || body.acceptPrivacy !== true) {
      return json({ message: "Terms and privacy consent required" }, 400);
    }
    if (store.users.some((u) => u.email === email)) {
      return json({ message: "Email already registered" }, 409);
    }
    const user = {
      id: store.nextUserId++,
      fullName: String(body.fullName),
      email,
      passwordHash: hashPassword(password),
      phoneNumber: body.phoneNumber ? String(body.phoneNumber) : undefined,
      address: body.address ? String(body.address) : undefined,
      employmentStatus: body.employmentStatus ? String(body.employmentStatus) : undefined,
      monthlyIncome: body.monthlyIncome ? Number(String(body.monthlyIncome).replace(/[^0-9.]/g, "")) : undefined,
      idPassportNumber: body.idPassportNumber ? String(body.idPassportNumber) : undefined,
      emailVerified: true,
    };
    store.users.push(user);
    return json({ message: "Account created. You can sign in now." }, 201);
  }

  if (route === "/auth/signup-institution" && method === "POST") {
    const email = String(body.institutionEmail || "").toLowerCase().trim();
    const password = String(body.password || "");
    if (!body.institutionName || !email || !password || !body.registrationLicenseNumber) {
      return json({ message: "Required institution fields are missing" }, 400);
    }
    if (!STRONG_PASSWORD.test(password)) {
      return json(
        { message: "Password must be 10+ chars with upper, lower, digit, and special character" },
        400
      );
    }
    if (store.institutions.some((i) => i.institutionEmail === email)) {
      return json({ message: "Institution email already registered" }, 409);
    }
    const inst = {
      id: store.nextInstId++,
      institutionName: String(body.institutionName),
      registrationLicenseNumber: String(body.registrationLicenseNumber),
      contactPersonName: body.contactPersonName ? String(body.contactPersonName) : undefined,
      businessAddress: body.businessAddress ? String(body.businessAddress) : undefined,
      institutionWebsite: body.institutionWebsite ? String(body.institutionWebsite) : undefined,
      institutionEmail: email,
      passwordHash: hashPassword(password),
      phoneNumber: body.phoneNumber ? String(body.phoneNumber) : undefined,
    };
    store.institutions.push(inst);
    const token = signToken({ sub: String(inst.id), email, role: "INSTITUTION", name: inst.institutionName });
    return json({ token, institution: toInstitutionResponse(inst) }, 201);
  }

  if (route === "/auth/login" && method === "POST") {
    const email = String(body.email || "").toLowerCase().trim();
    const user = store.users.find((u) => u.email === email);
    if (!user || !verifyPassword(String(body.password || ""), user.passwordHash)) {
      return json({ message: "Invalid credentials" }, 401);
    }
    const token = signToken({ sub: String(user.id), email: user.email, role: "APPLICANT", name: user.fullName });
    return json({ token, user: toUserResponse(user) });
  }

  if (route === "/auth/login-institution" && method === "POST") {
    const email = String(body.email || "").toLowerCase().trim();
    const inst = store.institutions.find((i) => i.institutionEmail === email);
    if (!inst || !verifyPassword(String(body.password || ""), inst.passwordHash)) {
      return json({ message: "Invalid credentials" }, 401);
    }
    const token = signToken({
      sub: String(inst.id),
      email: inst.institutionEmail,
      role: "INSTITUTION",
      name: inst.institutionName,
    });
    return json({ token, institution: toInstitutionResponse(inst) });
  }

  if (route === "/auth/google" && method === "POST") {
    const email = String(body.email || "").toLowerCase().trim();
    if (!email) return json({ message: "Email required" }, 400);
    let user = store.users.find((u) => u.email === email);
    if (!user) {
      user = {
        id: store.nextUserId++,
        fullName: String(body.fullName || email),
        email,
        passwordHash: hashPassword(`${Date.now()}Aa1!xxxx`),
        emailVerified: true,
      };
      store.users.push(user);
    }
    const token = signToken({ sub: String(user.id), email: user.email, role: "APPLICANT", name: user.fullName });
    return json({ token, user: toUserResponse(user) });
  }

  if (route === "/auth/forgot-password" && method === "POST") {
    return json({ message: "If that email exists, a reset link has been sent." });
  }

  if (route === "/auth/me" && method === "GET") {
    const payload = auth(req);
    if (!payload) return json({ message: "Unauthorized" }, 401);
    if (payload.role === "INSTITUTION") {
      const inst = store.institutions.find((i) => i.id === Number(payload.sub));
      if (!inst) return json({ message: "Not found" }, 404);
      return json(toInstitutionResponse(inst));
    }
    const user = store.users.find((u) => u.id === Number(payload.sub));
    if (!user) return json({ message: "Not found" }, 404);
    return json(toUserResponse(user));
  }

  if (route === "/credit/check" && method === "POST") {
    return json({ creditScore: 680, bureau: "sandbox", status: "CLEAR" });
  }

  if (route === "/verify/otp/send" && method === "POST") {
    const phone = String(body.phoneNumber || "unknown");
    const code = String(Math.floor(100000 + Math.random() * 900000));
    store.otps[phone] = code;
    return json({ message: "OTP sent", devCode: code });
  }

  if (route === "/verify/otp/confirm" && method === "POST") {
    const phone = String(body.phoneNumber || "");
    const verified = store.otps[phone] && store.otps[phone] === String(body.code || "");
    return json({ verified: Boolean(verified) }, verified ? 200 : 400);
  }

  if (route === "/verify/mpesa" && method === "POST") {
    return json({ verified: true, avgMonthlyVolume: 12500 });
  }

  if (route === "/applications" && method === "POST") {
    const payload = requireApplicant(req);
    if (!payload) return json({ message: "Unauthorized" }, 401);
    const user = store.users.find((u) => u.id === Number(payload.sub));
    if (!user) return json({ message: "User not found" }, 401);
    if (!body.loanType || !body.amount || !body.term || !body.purpose) {
      return json({ message: "loanType, amount, term, and purpose are required" }, 400);
    }
    const scored = scoreApplication(body, user);
    const amount = parseFloat(String(body.amount).replace(/[^0-9.]/g, "")) || 0;
    const app: StoredApplication = {
      id: store.nextAppId++,
      userId: user.id,
      referenceId: `CR-${Date.now().toString().slice(-8)}`,
      loanType: String(body.loanType),
      purpose: String(body.purpose),
      amount,
      termMonths: parseInt(String(body.term), 10) || 12,
      status: scored.status,
      aiCreditScore: scored.score,
      approvalProbability: scored.approvalProbability,
      recommendedAmount: scored.recommendedAmount,
      estimatedApr: scored.estimatedApr,
      aiSummary: scored.summary,
      aiRecommendation: scored.recommendation,
      submittedDate: new Date().toISOString().slice(0, 10),
      approvalDate: scored.status === "approved" ? new Date().toISOString().slice(0, 10) : undefined,
      customerName: user.fullName,
      customerEmail: user.email,
      monthlyIncome: scored.income,
      existingCreditScore: parseInt(String(body.creditScore || "650"), 10) || 650,
      debtToIncome: scored.dti,
      sectorDetails: (body.sectorDetails as Record<string, string>) || {},
      scoring: {
        creditScore: scored.score,
        approvalProbability: scored.approvalProbability,
        recommendedAmount: scored.recommendedAmount,
        estimatedApr: scored.estimatedApr,
        summary: scored.summary,
        recommendation: scored.recommendation,
        factors: scored.factors,
        amountOptions: scored.amountOptions,
      },
    };
    store.applications.push(app);
    return json(app, 201);
  }

  if (route === "/applications" && method === "GET") {
    const payload = requireApplicant(req);
    if (!payload) return json({ message: "Unauthorized" }, 401);
    return json(store.applications.filter((a) => a.userId === Number(payload.sub)));
  }

  const appMatch = route.match(/^\/applications\/(\d+)$/);
  if (appMatch && method === "GET") {
    const payload = requireApplicant(req);
    if (!payload) return json({ message: "Unauthorized" }, 401);
    const app = store.applications.find(
      (a) => a.id === Number(appMatch[1]) && a.userId === Number(payload.sub)
    );
    if (!app) return json({ message: "Not found" }, 404);
    return json(app);
  }

  if (route === "/dashboard/summary" && method === "GET") {
    const payload = requireApplicant(req);
    if (!payload) return json({ message: "Unauthorized" }, 401);
    const user = store.users.find((u) => u.id === Number(payload.sub));
    if (!user) return json({ message: "Unauthorized" }, 401);
    const apps = store.applications.filter((a) => a.userId === user.id);
    const approved = apps.filter((a) => a.status === "approved");
    return json({
      userName: user.fullName,
      userEmail: user.email,
      creditScore: approved[0]?.aiCreditScore || 650,
      approvalRate: apps.length ? approved.length / apps.length : 0,
      totalBorrowed: approved.reduce((s, a) => s + a.amount, 0),
      totalPaid: 0,
      remainingBalance: approved.reduce((s, a) => s + a.amount, 0),
      activeLoans: approved.length,
      pendingApplications: apps.filter((a) => a.status === "pending" || a.status === "processing").length,
      approvedApplications: approved.length,
      recentApplications: apps.slice(-5).reverse(),
      activeLoanList: [],
    });
  }

  if (route === "/loans" && method === "GET") {
    const payload = requireApplicant(req);
    if (!payload) return json({ message: "Unauthorized" }, 401);
    return json([]);
  }

  if (route === "/notifications" && method === "GET") {
    if (!auth(req)) return json({ message: "Unauthorized" }, 401);
    return json([]);
  }

  if (route === "/admin/dashboard" && method === "GET") {
    if (!requireInstitution(req)) return json({ message: "Unauthorized" }, 401);
    const apps = store.applications;
    return json({
      totalApplications: apps.length,
      pendingApplications: apps.filter((a) => a.status === "pending").length,
      approvedApplications: apps.filter((a) => a.status === "approved").length,
      rejectedApplications: apps.filter((a) => a.status === "rejected").length,
      totalCustomers: store.users.length,
      recentApplications: apps.slice(-8).reverse(),
    });
  }

  if (route === "/admin/applications" && method === "GET") {
    if (!requireInstitution(req)) return json({ message: "Unauthorized" }, 401);
    const status = req.nextUrl.searchParams.get("status") || "all";
    const apps =
      status === "all" ? store.applications : store.applications.filter((a) => a.status === status);
    return json(apps);
  }

  const adminApp = route.match(/^\/admin\/applications\/(\d+)$/);
  if (adminApp && method === "GET") {
    if (!requireInstitution(req)) return json({ message: "Unauthorized" }, 401);
    const app = store.applications.find((a) => a.id === Number(adminApp[1]));
    if (!app) return json({ message: "Not found" }, 404);
    return json({
      ...app,
      notes: store.notes.filter((n) => n.applicationId === app.id),
    });
  }

  const statusMatch = route.match(/^\/admin\/applications\/(\d+)\/status$/);
  if (statusMatch && method === "PATCH") {
    if (!requireInstitution(req)) return json({ message: "Unauthorized" }, 401);
    const app = store.applications.find((a) => a.id === Number(statusMatch[1]));
    if (!app) return json({ message: "Not found" }, 404);
    app.status = String(body.status || app.status).toLowerCase();
    if (app.status === "approved") app.approvalDate = new Date().toISOString().slice(0, 10);
    return json(app);
  }

  const noteMatch = route.match(/^\/admin\/applications\/(\d+)\/notes$/);
  if (noteMatch && method === "POST") {
    const payload = requireInstitution(req);
    if (!payload) return json({ message: "Unauthorized" }, 401);
    const note = {
      id: store.nextNoteId++,
      applicationId: Number(noteMatch[1]),
      officerEmail: payload.email,
      noteType: String(body.noteType || "NOTE"),
      content: String(body.content || ""),
      createdAt: new Date().toISOString(),
    };
    store.notes.push(note);
    return json(note, 201);
  }

  if (route === "/admin/customers" && method === "GET") {
    if (!requireInstitution(req)) return json({ message: "Unauthorized" }, 401);
    return json(
      store.users.map((u) => ({
        id: u.id,
        name: u.fullName,
        email: u.email,
        phone: u.phoneNumber,
        status: "active",
        joinDate: new Date().toISOString().slice(0, 10),
        creditScore: 650,
        activeLoans: store.applications.filter((a) => a.userId === u.id && a.status === "approved").length,
        totalBorrowed: store.applications
          .filter((a) => a.userId === u.id && a.status === "approved")
          .reduce((s, a) => s + a.amount, 0),
        lastActivity: new Date().toISOString().slice(0, 10),
      }))
    );
  }

  if (route === "/admin/reports" && method === "GET") {
    if (!requireInstitution(req)) return json({ message: "Unauthorized" }, 401);
    const apps = store.applications;
    const approved = apps.filter((a) => a.status === "approved");
    return json({
      totalLoanVolume: approved.reduce((s, a) => s + a.amount, 0),
      approvalRate: apps.length ? approved.length / apps.length : 0,
      averageInterestRate: 9.5,
      defaultRate: 0.02,
      totalApplications: apps.length,
      approvedApplications: approved.length,
      rejectedApplications: apps.filter((a) => a.status === "rejected").length,
      pendingApplications: apps.filter((a) => a.status === "pending").length,
      loanPerformance: [],
      loanDistribution: [],
      creditScoreDistribution: [],
      defaultRateTrend: [],
    });
  }

  if (route === "/admin/loans" && method === "GET") {
    if (!requireInstitution(req)) return json({ message: "Unauthorized" }, 401);
    return json([]);
  }

  if (route === "/admin/documents" && method === "GET") {
    if (!requireInstitution(req)) return json({ message: "Unauthorized" }, 401);
    return json([]);
  }

  if (route === "/admin/audit-logs" && method === "GET") {
    if (!requireInstitution(req)) return json({ message: "Unauthorized" }, 401);
    return json([]);
  }

  return json({ message: `No handler for ${method} ${route}` }, 404);
}

async function withPath(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  const { path } = await Promise.resolve(ctx.params);
  return handle(req, path || []);
}

export const GET = withPath;
export const POST = withPath;
export const PATCH = withPath;
export const PUT = withPath;
export const DELETE = withPath;
