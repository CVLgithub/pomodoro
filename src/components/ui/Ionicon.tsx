import { Ionicons } from '@expo/vector-icons';

type SupportedIoniconName =
  | 'sunny-outline'
  | 'timer-outline'
  | 'calendar-outline'
  | 'list-outline'
  | 'bar-chart-outline'
  | 'checkmark';

interface IoniconProps {
  name: SupportedIoniconName;
  color: string;
  size: number;
}

export const Ionicon = ({ name, color, size }: IoniconProps) => (
  <Ionicons name={name} color={color} size={size} />
);
