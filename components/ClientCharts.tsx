"use client";
import dynamic from "next/dynamic";

export const GapChart = dynamic(() => import("./charts").then((m) => m.GapChart), { ssr: false, loading: () => <p className="note">Loading the chart.</p> });
export const HistoryChart = dynamic(() => import("./charts").then((m) => m.HistoryChart), { ssr: false, loading: () => <p className="note">Loading the chart.</p> });
export const Radar = dynamic(() => import("./charts").then((m) => m.Radar), { ssr: false, loading: () => <p className="note">Loading the chart.</p> });
export const RankChart = dynamic(() => import("./charts").then((m) => m.RankChart), { ssr: false, loading: () => <p className="note">Loading the chart.</p> });
export const RankMoves = dynamic(() => import("./RankMoves").then((m) => m.RankMoves), { ssr: false, loading: () => <p className="note">Loading the chart.</p> });
export const Scatter = dynamic(() => import("./Scatter").then((m) => m.Scatter), { ssr: false, loading: () => <p className="note">Loading the chart.</p> });
