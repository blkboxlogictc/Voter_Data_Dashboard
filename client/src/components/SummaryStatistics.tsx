import { Card } from "@/components/ui/card";
import { SummaryStatistic } from "@shared/schema";
import { TrendingDown, TrendingUp, MinusIcon, HelpingHand, Users, CheckCircle } from "lucide-react";

interface SummaryStatisticsProps {
  stats: SummaryStatistic[];
}

const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case "how_to_reg":
      return <HelpingHand className="text-primary p-2 rounded-full bg-primary/10" size={40} />;
    case "poll":
      return <Users className="text-primary p-2 rounded-full bg-primary/10" size={40} />;
    case "check_circle":
      return <CheckCircle className="text-primary p-2 rounded-full bg-primary/10" size={40} />;
    default:
      return <Users className="text-primary p-2 rounded-full bg-primary/10" size={40} />;
  }
};

const getTrendIcon = (direction?: 'up' | 'down' | 'stable') => {
  switch (direction) {
    case 'up':
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    case 'down':
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    default:
      return <MinusIcon className="h-4 w-4 text-neutral-500" />;
  }
};

export default function SummaryStatistics({ stats }: SummaryStatisticsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
      {stats.map((stat, index) => (
        <Card key={index} className="bg-white rounded-lg shadow-sm hover:shadow transition p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500">{stat.label}</p>
              <p className="text-2xl font-semibold mt-1 text-neutral-900">{stat.value}</p>
            </div>
            {getIconComponent(stat.icon)}
          </div>
          {stat.trend && (
            <div className="mt-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-500">{stat.trend}</span>
                <span className="flex items-center">
                  {getTrendIcon(stat.trendDirection)}
                </span>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
