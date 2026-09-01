import React from "react";
import {
  Rocket,
  Target,
  Users,
  Zap,
  MessageSquare,
  Layout,
  Sparkles,
} from "lucide-react";

const BuildingInPublic = () => {
  return (
    <div className="min-h-screen bg-[#191919] text-white font-sans selection:bg-accent selection:text-white overflow-y-auto">
      {/* Background patterns */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="FounderStack Logo"
              className="h-10 w-auto"
            />
            <span className="text-xl font-bold tracking-tight">
              FounderStack <span className="text-accent">CRM</span>
            </span>
          </div>
          <div className="px-4 py-1.5 bg-[#202020] border border-[#2f2f2f] rounded-full text-xs font-medium text-textSecondary uppercase tracking-wider">
            Phase 1: Alpha Build
          </div>
        </header>

        {/* Hero Section */}
        <div className="mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-6">
            <Sparkles size={16} />
            Building in Public
          </div>
          <h1
            dir="auto"
            className="text-5xl md:text-7xl font-bold mb-12 mt-6 tracking-tight leading-[1.1]"
          >
            عم أبني <span className="text-accent">FounderStack</span> بالعَلَن!
          </h1>
          <p className="text-xl md:text-2xl text-textSecondary max-w-2xl leading-relaxed">
            The AI-native CRM built for solo founders who hate complex
            workflows. Context First. AI second. Simplicity Always.
          </p>
        </div>

        {/* Grid Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {/* Card 1: The Problem */}
          <div className="md:col-span-2 p-8 bg-[#202020] border border-[#2f2f2f] rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Target className="text-accent" size={20} />
                Why FounderStack?
              </h3>
              <p className="text-textSecondary leading-relaxed mb-6">
                "When I was selling my email automation product, I realized most
                of my time was wasted finding context — conversations spread
                across LinkedIn, email, WhatsApp, notes — and then re-feeding
                all of that into AI to write good messages."
              </p>
            </div>

            {/* Live Preview Mockup */}
            <div className="bg-[#191919] border border-[#2f2f2f] rounded-xl p-4 mt-4 shadow-2xl">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#2f2f2f]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
                <div className="text-[10px] text-textSecondary font-mono uppercase tracking-widest">
                  Lead Insight Engine
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center text-accent font-bold">
                  JD
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-sm">John Doe</div>
                    <div className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                      Active on LinkedIn
                    </div>
                  </div>
                  <div dir="auto" className="text-xs text-textSecondary line-clamp-1">
                    Last message: "I'm interested in the early access, how do I
                    join?"
                  </div>
                  <div className="mt-3 flex gap-2">
                    <div className="h-6 w-20 bg-[#2f2f2f] rounded animate-pulse" />
                    <div className="h-6 w-32 bg-[#2f2f2f] rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-8">
              <div className="flex items-center gap-2 text-sm text-textSecondary bg-[#191919] px-3 py-2 rounded-lg border border-[#2f2f2f]">
                <MessageSquare size={16} className="text-accent" />
                Cross-channel Context
              </div>
              <div className="flex items-center gap-2 text-sm text-textSecondary bg-[#191919] px-3 py-2 rounded-lg border border-[#2f2f2f]">
                <Zap size={16} className="text-accent" />
                AI-Native Execution
              </div>
              <div className="flex items-center gap-2 text-sm text-textSecondary bg-[#191919] px-3 py-2 rounded-lg border border-[#2f2f2f]">
                <Users size={16} className="text-accent" />
                Solo-Founder First
              </div>
            </div>
          </div>

          {/* Card 2: Status */}
          <div className="p-8 bg-accent border border-accent/20 rounded-2xl text-white">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Rocket size={20} />
              Progress
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1 font-medium">
                  <span>Core Dashboard</span>
                  <span>90%</span>
                </div>
                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                  <div className="bg-white h-full w-[90%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1 font-medium">
                  <span>AI Context Engine</span>
                  <span>65%</span>
                </div>
                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                  <div className="bg-white h-full w-[65%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1 font-medium">
                  <span>Multi-channel Sync</span>
                  <span>40%</span>
                </div>
                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                  <div className="bg-white h-full w-[40%]" />
                </div>
              </div>
            </div>
            <button className="w-full mt-8 py-3 bg-white text-accent font-bold rounded-xl hover:bg-opacity-90 transition-all">
              Join Early Access
            </button>
          </div>
        </div>

        {/* Pricing / Access Hook */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <div className="p-8 bg-[#202020] border-t-2 border-t-accent rounded-2xl">
            <h3 className="text-xl font-bold mb-4">Solo Founder Promise</h3>
            <p className="text-textSecondary mb-6 italic">
              "If you have less than 10 clients, FounderStack is Free Forever.
              We win when you win."
            </p>
            <div className="inline-flex items-center gap-2 text-accent font-semibold">
              <Zap size={18} />
              $0 / month for early growth
            </div>
          </div>
          <div className="p-8 bg-[#202020] border border-[#2f2f2f] rounded-2xl">
            <h3 className="text-xl font-bold mb-4">Choose Your Track</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-accent/20 flex items-center justify-center text-accent font-bold text-xs">
                  A
                </div>
                <div className="text-sm">
                  <span className="font-semibold">Alpha Track:</span> Direct
                  feedback, rapid updates.
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-green-500/20 flex items-center justify-center text-green-500 font-bold text-xs">
                  S
                </div>
                <div className="text-sm">
                  <span className="font-semibold">Stable Track:</span> Reliable
                  builds, steady progress.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vision Snippet */}
        <div className="p-12 bg-[#202020] border border-[#2f2f2f] rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Layout size={120} />
          </div>
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold mb-6">Our Vision</h2>
            <div className="space-y-4 text-lg text-textSecondary italic">
              <p>
                "CRMs didn’t help: they’re built for teams, heavy workflows, and
                endless customization. Nothing simple for solo founders under
                ~50 clients."
              </p>
              <p>
                "I’m building what I wish existed when I started selling a
                product."
              </p>
            </div>
            <div className="mt-8 flex items-center gap-4">
              <div className="w-12 h-12 bg-[#2f2f2f] rounded-full border border-[#3f3f3f]" />
              <div>
                <div className="font-semibold text-white">
                  FounderStack Team
                </div>
                <div className="text-sm text-textSecondary italic">
                  Building the future of AI-native CRM
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info for the post */}
        <div className="mt-12 text-center text-textSecondary text-sm">
          <p>FounderStack CRM © 2025 • Building in Public</p>
        </div>
      </div>
    </div>
  );
};

export default BuildingInPublic;
