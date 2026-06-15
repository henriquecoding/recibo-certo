import {
  Wallet,
  Scale,
  ShieldCheck,
  ChartProjection,
  Sparkle,
  Bank,
  Briefcase,
  Home,
  Calendar,
  FileSign,
  LayoutGrid,
} from "@/components/ui/Icons";

export interface IconProps {
  size?: number;
  className?: string;
}

export const QUIZ_ICON_MAP: Record<string, (props: IconProps) => React.ReactElement> = {
  Wallet,
  Scale,
  ShieldCheck,
  ChartProjection,
  Sparkle,
  Bank,
  Briefcase,
  Home,
  Calendar,
  FileSign,
  LayoutGrid,
};

export function resolveQuizIcon(name: string): (props: IconProps) => React.ReactElement {
  return QUIZ_ICON_MAP[name] ?? LayoutGrid;
}
