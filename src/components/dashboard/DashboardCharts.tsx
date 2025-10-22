"use client";

import React, { memo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { CheckCircle } from "lucide-react";

interface ChartData {
  conversationTrends: Array<{ 
    date: string; 
    facebook: number;
    instagram: number;
    telegram: number;
    widget: number;
    total: number;
  }>;
  messageTrends: Array<{
    date: string;
    userMessages: number;
    botMessages: number;
    agentMessages: number;
    total: number;
  }>;
  hourlyActivity: Array<{
    hour: string;
    messages: number;
    conversations: number;
  }>;
}

interface DashboardChartsProps {
  chartData: ChartData;
  chartsLoading: boolean;
}

const conversationChartConfig = {
  facebook: {
    label: "Facebook",
    color: "hsl(221, 83%, 53%)", // Facebook blue #1877F2
  },
  instagram: {
    label: "Instagram",
    color: "hsl(329, 70%, 58%)", // Instagram pink #E4405F
  },
  telegram: {
    label: "Telegram",
    color: "hsl(200, 98%, 50%)", // Telegram blue #0088cc
  },
  widget: {
    label: "Chat Widget",
    color: "hsl(142, 76%, 36%)", // Green #22c55e
  },
  total: {
    label: "Total",
    color: "hsl(0, 0%, 50%)", // Gray for total line
  },
} satisfies ChartConfig;

const messageChartConfig = {
  userMessages: {
    label: "User Messages",
    color: "hsl(var(--chart-1))",
  },
  botMessages: {
    label: "Bot Messages",
    color: "hsl(var(--chart-2))",
  },
  agentMessages: {
    label: "Agent Messages",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

const hourlyChartConfig = {
  messages: {
    label: "Messages",
    color: "hsl(var(--chart-1))",
  },
  conversations: {
    label: "Conversations",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const LoadingChart = memo(() => (
  <div className="h-[400px] flex items-center justify-center">
    <div className="animate-pulse text-muted-foreground">Loading chart...</div>
  </div>
));

LoadingChart.displayName = "LoadingChart";

const ConversationTrendsChart = memo(
  ({ data }: { data: Array<{ 
    date: string; 
    facebook: number;
    instagram: number;
    telegram: number;
    widget: number;
    total: number;
  }> }) => (
    <ChartContainer
      config={conversationChartConfig}
      className="h-[400px] w-full"
    >
      <LineChart
        accessibilityLayer
        data={data}
        margin={{
          left: 12,
          right: 12,
        }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => value.slice(0, 6)} // Show "Jan 1" format
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Line
          dataKey="facebook"
          type="monotone"
          stroke="var(--color-facebook)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          dataKey="instagram"
          type="monotone"
          stroke="var(--color-instagram)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          dataKey="telegram"
          type="monotone"
          stroke="var(--color-telegram)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          dataKey="widget"
          type="monotone"
          stroke="var(--color-widget)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  )
);

ConversationTrendsChart.displayName = "ConversationTrendsChart";

const MessageActivityChart = memo(
  ({
    data,
  }: {
    data: Array<{
      date: string;
      userMessages: number;
      botMessages: number;
      agentMessages: number;
      total: number;
    }>;
  }) => (
    <ChartContainer config={messageChartConfig} className="h-[300px]">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="userMessages"
          stroke="var(--color-userMessages)"
          strokeWidth={2}
          dot={{ r: 3 }}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="botMessages"
          stroke="var(--color-botMessages)"
          strokeWidth={2}
          dot={{ r: 3 }}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="agentMessages"
          stroke="var(--color-agentMessages)"
          strokeWidth={2}
          dot={{ r: 3 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  )
);

MessageActivityChart.displayName = "MessageActivityChart";

const HourlyActivityChart = memo(
  ({
    data,
  }: {
    data: Array<{ hour: string; messages: number; conversations: number }>;
  }) => (
    <ChartContainer config={hourlyChartConfig} className="h-[300px]">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="hour"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="messages"
          stroke="var(--color-messages)"
          strokeWidth={2}
          dot={{ r: 3 }}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="conversations"
          stroke="var(--color-conversations)"
          strokeWidth={2}
          dot={{ r: 3 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  )
);

HourlyActivityChart.displayName = "HourlyActivityChart";

const DashboardCharts = memo(
  ({ chartData, chartsLoading }: DashboardChartsProps) => {
    return (
      <div className="space-y-6">
        {/* Conversation Trends Chart - Full Width */}
        <Card className="w-full" key="conversation-trends">
          <CardHeader>
            <CardTitle>Conversation Trends</CardTitle>
            <CardDescription>
              Daily conversation volume by platform over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartsLoading ? (
              <LoadingChart />
            ) : (
              <ConversationTrendsChart
                key={`conv-chart-${chartData.conversationTrends.length}`}
                data={chartData.conversationTrends}
              />
            )}
          </CardContent>
        </Card>

        {/* Message Trends Chart */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card key="message-activity">
            <CardHeader>
              <CardTitle>Message Activity</CardTitle>
              <CardDescription>
                Message breakdown by sender type (30 days)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartsLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="animate-pulse text-muted-foreground">
                    Loading chart...
                  </div>
                </div>
              ) : (
                <MessageActivityChart
                  key={`msg-chart-${chartData.messageTrends.length}`}
                  data={chartData.messageTrends}
                />
              )}
            </CardContent>
          </Card>

          {/* Today's Hourly Activity */}
          <Card key="hourly-activity">
            <CardHeader>
              <CardTitle>Today&apos;s Activity</CardTitle>
              <CardDescription>
                Hourly message and conversation activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartsLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="animate-pulse text-muted-foreground">
                    Loading chart...
                  </div>
                </div>
              ) : (
                <HourlyActivityChart
                  key={`hourly-chart-${chartData.hourlyActivity.length}`}
                  data={chartData.hourlyActivity}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
);

DashboardCharts.displayName = "DashboardCharts";

export default DashboardCharts;
