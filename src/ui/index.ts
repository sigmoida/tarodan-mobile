/** @format */

export { theme, type Theme } from './lib/theme';
export { useHeaderTopInset } from './lib/header';

export {
	Button,
	type ButtonProps,
	type ButtonVariant,
	type ButtonSize,
} from './components/Button';
export { ButtonRow, type ButtonRowProps } from './components/ButtonRow';
export {
	IconButton,
	type IconButtonProps,
	type IconButtonVariant,
	type IconButtonSize,
	iconButtonBoxSize,
} from './components/IconButton';
export {
	Text,
	RawText,
	type TextProps,
	type RawTextProps,
	type TextVariant,
	type TextTone,
} from './components/Text';
export {
	Icon,
	isIconName,
	resolveIcon,
	type IconProps,
	type IconName,
	type IconVariant,
	type IconRef,
	type LegacyIoniconName,
} from './icons';
export { RawTextInput } from './components/RawTextInput';
export { BrandFontProvider, useBrandFont } from './lib/font';
export { Stack, VStack, HStack, type StackProps } from './components/Stack';
export {
	Screen,
	type ScreenProps,
	type ScreenBackground,
} from './components/Screen';
export {
	ScreenHeader,
	TopBarAction,
	TOP_BAR_HEIGHT,
	type ScreenHeaderProps,
	type ScreenHeaderVariant,
	type TopBarActionProps,
} from './components/ScreenHeader';
export {
	CountBadge,
	BADGE_ANCHOR_OFFSET,
	type CountBadgeProps,
} from './components/CountBadge';
export { BadgeAnchor, type BadgeAnchorProps } from './components/BadgeAnchor';
export {
	Pill,
	pillBoxStyle,
	pillTextStyle,
	pillMetrics,
	type PillProps,
	type PillSize,
	type PillShape,
} from './components/Pill';
export {
	SheetHeader,
	type SheetHeaderProps,
} from './components/SheetHeader';
export {
	HeaderIconButton,
	type HeaderIconButtonProps,
	type HeaderIconTone,
} from './components/HeaderIconButton';
export {
	PageShell,
	PAGE_GUTTER,
	PAGE_SECTION_GAP,
	pageListContentStyle,
	type PageShellProps,
	type PageShellMode,
} from './components/PageShell';
export { PageHeader, type PageHeaderProps } from './components/PageHeader';
export { EmptyState, type EmptyStateProps } from './components/EmptyState';
export { ErrorState, type ErrorStateProps } from './components/ErrorState';
export {
	ScreenLoader,
	type ScreenLoaderProps,
} from './components/ScreenLoader';
export {
	Chip,
	type ChipProps,
	type ChipVariant,
	type ChipSize,
} from './components/Chip';
export { Divider, type DividerProps } from './components/Divider';
export { Switch, type SwitchProps } from './components/Switch';
export {
	SegmentedButtons,
	type SegmentedButtonsProps,
	type SegmentedOption,
} from './components/SegmentedButtons';
export { ProgressBar, type ProgressBarProps } from './components/ProgressBar';
export {
	FAB,
	type FABProps,
	type FABVariant,
	type FABSize,
} from './components/FAB';
export {
	Snackbar,
	type SnackbarProps,
	type SnackbarVariant,
} from './components/Snackbar';
export {
	toast,
	ToastHost,
	type ToastKind,
	type ToastOptions,
} from './components/Toast';
export { Input, type InputProps } from './components/Input';
export {
	Label,
	FieldMessage,
	type LabelProps,
	type FieldMessageProps,
} from './components/Label';
// The RHF + zod form layer is exposed via the `@/ui/form` subpath
// so it only pulls zod/react-hook-form into bundles that actually build forms.
export { DateField, type DateFieldProps } from './components/DateField';
export { Textarea, type TextareaProps } from './components/Textarea';
export {
	Select,
	type SelectProps,
	type SelectOption,
} from './components/Select';
export { Checkbox, type CheckboxProps } from './components/Checkbox';
export {
	Radio,
	RadioGroup,
	type RadioProps,
	type RadioGroupProps,
	type RadioGroupOption,
} from './components/Radio';
export { Card, type CardProps } from './components/Card';
export { ListRowCard, type ListRowCardProps } from './components/ListRowCard';
export {
	SectionCard,
	SectionCardAction,
	type SectionCardProps,
	type SectionCardActionProps,
} from './components/SectionCard';
export {
	Badge,
	type BadgeProps,
	type BadgeVariant,
	type BadgeAppearance,
} from './components/Badge';
export {
	ProductBadge,
	type ProductBadgeProps,
	type ProductBadgeVariant,
} from './components/ProductBadge';
export { Alert, type AlertProps, type AlertVariant } from './components/Alert';
export {
	Modal,
	MODAL_MAX_WIDTH,
	MODAL_CLOSE_HEADER_HEIGHT,
	type ModalProps,
	type ModalSize,
} from './components/Modal';
export { ModalFooter, type ModalFooterProps } from './components/ModalFooter';
export {
	appAlert,
	AlertDialogHost,
	type AlertDialogButton,
	type AlertDialogOptions,
} from './components/AlertDialog';
export {
	useModalMessage,
	ModalMessage,
	alertAfterClose,
	runAfterModalClose,
	MODAL_CLOSE_DELAY_MS,
	type ModalMessageState,
} from './ModalMessage';
export { Spinner, type SpinnerProps } from './components/Spinner';
export {
	Stepper,
	useStepper,
	type StepperProps,
	type StepperStep,
} from './components/Stepper';
export {
	QuantityStepper,
	type QuantityStepperProps,
} from './components/QuantityStepper';
export {
	Skeleton,
	SkeletonText,
	SkeletonCard,
	SkeletonAvatar,
	type SkeletonProps,
} from './components/Skeleton';
export { Avatar, type AvatarProps } from './components/Avatar';
export { StatusBadge, type StatusBadgeProps } from './components/StatusBadge';

// Durum haritaları `@/lib/shared/status-configs`'ten (web status-configs'in tek kaynağı)
// doğrudan alınır; `@/ui` artık çevrilmemiş `{labelKey, variant}` haritalarını yeniden ihraç
// etmez (tüketicisi yoktu).
