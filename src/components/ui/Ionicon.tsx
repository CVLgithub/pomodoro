import { Ionicons } from '@expo/vector-icons';

type SupportedIoniconName =
  | 'sunny-outline'
  | 'sunny'
  | 'timer-outline'
  | 'timer'
  | 'calendar-outline'
  | 'calendar'
  | 'list-outline'
  | 'list'
  | 'bar-chart-outline'
  | 'bar-chart'
  | 'settings-outline'
  | 'play'
  | 'pause'
  | 'stop'
  | 'refresh'
  | 'repeat'
  | 'checkmark';

interface IoniconProps {
  name: SupportedIoniconName;
  color: string;
  size: number;
}

export const Ionicon = ({ name, color, size }: IoniconProps) => (
  <Ionicons name={name} color={color} size={size} />
);
