/**
 * Adapted from shadcn-admin@e16c87f213a5ba5e45964e9b67c792105ec74d26.
 * Copyright (c) 2024 Sat Naing. MIT License; see THIRD_PARTY_NOTICES.md.
 */
import type { ComponentType, SVGProps } from "react";
import { CircleCheck, Monitor, Moon, RotateCcw, Settings2, Sun } from "lucide-react";
import { cn, useTheme, type Theme } from "@/shared/lib";
import {
  RadioGroup,
  RadioGroupItem,
  ShadcnButton,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  useSidebar,
} from "@/shared/ui";
import {
  type SidebarCollapsible,
  type SidebarVariant,
  useLayout,
} from "../model/layout-context";
import {
  IconLayoutCompact,
  IconLayoutExpanded,
  IconLayoutFull,
  IconSidebarFloating,
  IconSidebarInset,
  IconSidebarStandard,
} from "./LayoutPreviewIcons";

interface Choice {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
}

const themeChoices: Choice[] = [
  { icon: Monitor, label: "시스템", value: "system" },
  { icon: Sun, label: "라이트", value: "light" },
  { icon: Moon, label: "다크", value: "dark" },
];

const sidebarChoices: Choice[] = [
  { icon: IconSidebarInset, label: "인셋", value: "inset" },
  { icon: IconSidebarFloating, label: "플로팅", value: "floating" },
  { icon: IconSidebarStandard, label: "기본", value: "sidebar" },
];

const layoutChoices: Choice[] = [
  { icon: IconLayoutExpanded, label: "확장", value: "default" },
  { icon: IconLayoutCompact, label: "아이콘", value: "icon" },
  { icon: IconLayoutFull, label: "전체화면", value: "offcanvas" },
];

function SettingSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function ChoiceGrid({
  choices,
  onValueChange,
  value,
}: {
  choices: Choice[];
  onValueChange: (value: string) => void;
  value: string;
}) {
  return (
    <RadioGroup
      className="grid grid-cols-3 gap-3"
      onValueChange={onValueChange}
      value={value}
    >
      {choices.map(({ icon: Icon, label, value: optionValue }) => (
        <RadioGroupItem
          aria-label={label}
          className={cn(
            "group relative h-auto w-auto rounded-lg border bg-card p-2 text-card-foreground shadow-xs",
            "transition hover:border-primary/55 hover:bg-accent/50 focus-visible:ring-2",
            "data-[state=checked]:border-primary data-[state=checked]:bg-primary/5 data-[state=checked]:text-primary",
            "[&_[data-slot=radio-group-indicator]]:hidden",
          )}
          key={optionValue}
          value={optionValue}
        >
          <CircleCheck className="absolute -end-2 -top-2 hidden size-5 fill-primary text-primary-foreground group-data-[state=checked]:block" />
          <Icon className="mx-auto mb-1.5 h-12 w-full" aria-hidden="true" />
          <span className="block text-center text-xs font-medium">{label}</span>
        </RadioGroupItem>
      ))}
    </RadioGroup>
  );
}

export function LayoutSettings() {
  const { resetTheme, setTheme, theme } = useTheme();
  const { open, setOpen } = useSidebar();
  const { collapsible, resetLayout, setCollapsible, setVariant, variant } =
    useLayout();
  const layoutValue = open ? "default" : collapsible;

  const handleReset = () => {
    setOpen(true);
    resetTheme();
    resetLayout();
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <ShadcnButton
          aria-label="화면 설정"
          className="rounded-full"
          size="icon"
          type="button"
          variant="ghost"
        >
          <Settings2 />
        </ShadcnButton>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader className="pb-0 text-start">
          <SheetTitle>화면 설정</SheetTitle>
          <SheetDescription>
            테마와 사이드바 형태를 업무 환경에 맞게 바꿉니다.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-7 overflow-y-auto px-4 py-2">
          <SettingSection title="테마">
            <ChoiceGrid
              choices={themeChoices}
              onValueChange={(value) => setTheme(value as Theme)}
              value={theme}
            />
          </SettingSection>
          <SettingSection title="사이드바 형태">
            <ChoiceGrid
              choices={sidebarChoices}
              onValueChange={(value) => setVariant(value as SidebarVariant)}
              value={variant}
            />
          </SettingSection>
          <SettingSection title="접기 방식">
            <ChoiceGrid
              choices={layoutChoices}
              onValueChange={(value) => {
                if (value === "default") {
                  setOpen(true);
                  return;
                }

                setCollapsible(value as SidebarCollapsible);
                setOpen(false);
              }}
              value={layoutValue}
            />
          </SettingSection>
        </div>
        <SheetFooter>
          <ShadcnButton onClick={handleReset} type="button" variant="outline">
            <RotateCcw />
            기본값으로 되돌리기
          </ShadcnButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
