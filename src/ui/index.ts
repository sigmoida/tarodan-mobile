/** @format */

export { theme, type Theme } from './lib/theme';
export { useHeaderTopInset, useHeaderBarInset } from './lib/header';
export {
	usePageScrollHandler,
	usePageScrollValue,
	useShellPageScroll,
	useShellScrollState,
	useResetScrollOnBind,
	ShellScrollProvider,
	scrollEdgeOpacity,
	pageScrollOffset,
	SCROLL_EDGE_FULL_AT,
	withTopInset,
	type PageScroll,
	type PageScrollValue,
} from './lib/pageScroll';
export { ScrollEdge, type ScrollEdgeProps } from './components/ScrollEdge';
export { useScreenFocused } from './lib/screenFocus';

export {
	Button,
	touchSlop,
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
	RefIcon,
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
	ScreenHeader,
	TopBarAction,
	TopBarLabel,
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
export {
	GlassSurface,
	TINT_FILL_OPACITY,
	type GlassSurfaceProps,
	type GlassShape,
} from './components/GlassSurface';
export {
	GlassIconButton,
	GLASS_ICON_BUTTON_SIZE,
	GLASS_ICON_BUTTON_SIZE_SM,
	type GlassIconButtonProps,
	type GlassIconButtonSize,
	type GlassIconTone,
} from './components/GlassIconButton';
export { usePressScale, PRESS_SCALE, PRESS_SPRING } from './lib/pressScale';
export {
	androidRipple,
	rippleClip,
	showPressedStyle,
	pressedStyle,
	type RippleOptions,
	type RippleTone,
} from './lib/pressableFeedback';
export { isModalPresent, subscribeModalPresence, useModalPresence } from './lib/modalPresence';
export { setToastErrorFilter } from './lib/toastStore';
export { useKeyboardAvoid, type KeyboardAvoid } from './lib/keyboard';
export { getGlassView, resetGlassCache, type GlassViewComponent } from './lib/glass';
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
	type PageShellProps,
	type PageShellMode,
	type PageShellContentWidth,
} from './components/PageShell';
export { PAGE_GUTTER, PAGE_SECTION_GAP, pageListContentStyle } from './lib/pageLayout';
export {
  CARD_GRID_COLUMNS,
  GRID_GAP_PERCENT,
  gridCellStyle,
  gridCellWidth,
  gridColumns,
  readableContentStyle,
  readableGutter,
  useGridColumns,
  useReadableContentStyle,
  useReadableGutter,
  useWindowClass,
  windowClassOf,
  type ContentWidth,
  type GridColumnSpec,
  type WindowClass,
} from './lib/windowClass';
export { PageHeader, type PageHeaderProps } from './components/PageHeader';
export { EmptyState, EMPTY_STATE_TOP_OFFSET, type EmptyStateProps, type EmptyStatePlacement } from './components/EmptyState';
export { ErrorState, type ErrorStateProps } from './components/ErrorState';
export {
	Chip,
	CHIP_HEIGHT,
	type ChipProps,
	type ChipVariant,
	type ChipSize,
} from './components/Chip';
export {
	ChipTabs,
	chipTabLabel,
	type ChipTabsProps,
	type ChipTabItem,
} from './components/ChipTabs';
export { Divider, type DividerProps } from './components/Divider';
export { Switch, type SwitchProps, type SwitchSize } from './components/Switch';
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
	toast,
	ToastHost,
	ToastLayer,
	useToastBottomInset,
	type ToastLayerProps,
	type ToastId,
	type ToastKind,
	type ToastOptions,
} from './components/Toast';
export { Input, type InputProps } from './components/Input';
export { FieldTrigger, type FieldTriggerProps } from './components/FieldTrigger';
export {
	fieldBoxStyle,
	fieldSizeStyle,
	fieldBorderColor,
	fieldBackgroundColor,
	SEARCH_FIELD_BORDER_COLOR,
	type FieldSize,
	type FieldBoxOptions,
} from './lib/fieldSurface';
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
export {
  Checkbox,
  CheckboxIndicator,
  type CheckboxProps,
  type CheckboxIndicatorProps,
} from './components/Checkbox';
export {
	Radio,
	RadioIndicator,
	type RadioIndicatorProps,
	RadioGroup,
	type RadioProps,
	type RadioGroupProps,
	type RadioGroupOption,
} from './components/Radio';
export { Card, type CardProps } from './components/Card';
export { ListRowCard, type ListRowCardProps } from './components/ListRowCard';
export {
	Accordion,
	AccordionItem,
	AccordionTrigger,
	AccordionContent,
	type AccordionProps,
	type AccordionItemProps,
	type AccordionTriggerProps,
	type AccordionContentProps,
} from './components/Accordion';
export {
	SectionCard,
	SectionCardAction,
	SECTION_CARD_METRICS,
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
	type ModalVariant,
} from './components/Modal';
export { ModalFooter, type ModalFooterProps } from './components/ModalFooter';
// Alttan açılan her şey bu üç primitive'den (ham RN Modal ile sheet yazılmaz).
export {
  BottomSheet,
  useBottomSheet,
  type BottomSheetProps,
  type BottomSheetController,
  type BottomSheetSize,
} from './components/BottomSheet';
export {
  SelectSheet,
  type SelectSheetProps,
  type SelectSheetSingleProps,
  type SelectSheetMultiProps,
  type SelectSheetOption,
} from './components/SelectSheet';
export { ActionSheet, type ActionSheetProps, type ActionSheetAction } from './components/ActionSheet';
export {
	appAlert,
	dismissAlert,
	confirm,
	AlertDialogHost,
	type AlertDialogButton,
	type AlertDialogOptions,
	type ConfirmOptions,
} from './components/AlertDialog';
export {
	useModalMessage,
	ModalMessage,
	alertAfterClose,
	runAfterModalClose,
	MODAL_CLOSE_DELAY_MS,
	type ModalMessageState,
} from './ModalMessage';
// Yükleme sistemi: tek gösterge (LoadingIndicator = değiştirme noktası), tek iskelet sürücüsü,
// yerleşime sadık iskelet yapı taşları, gecikmeli gösterim (bkz. src/ui/loading/index.ts).
export * from './loading';
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
export { Avatar, AVATAR_SIZES, avatarPlaceholderColors, type AvatarProps } from './components/Avatar';
export { StatusBadge, type StatusBadgeProps } from './components/StatusBadge';

// Durum haritaları `@/lib/shared/status-configs`'ten (web status-configs'in tek kaynağı)
// doğrudan alınır; `@/ui` artık çevrilmemiş `{labelKey, variant}` haritalarını yeniden ihraç
// etmez (tüketicisi yoktu).
export {
	floatingBottomOffset,
	useFloatingBottomOffset,
	useFabContentInset,
	FAB_SIZE_MD,
	FAB_SIZE_SM,
	FLOATING_ACTION_SIZE,
	FLOATING_ACTION_ICON_SIZE,
	FLOATING_SIDE_GAP,
} from './lib/floating';
