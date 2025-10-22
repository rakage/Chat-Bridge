"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
  LogOut,
  Building,
  GraduationCap,
  Link as LinkIcon,
  Brain,
  Play,
  ChevronUp,
  User2,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navigation = [
  {
    name: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["OWNER", "ADMIN", "AGENT"],
  },
  {
    name: "Conversations",
    href: "/dashboard/conversations",
    icon: MessageSquare,
    roles: ["OWNER", "ADMIN", "AGENT"],
  },
  {
    name: "Integrations",
    href: "/dashboard/integrations",
    icon: LinkIcon,
    roles: ["OWNER", "ADMIN"],
  },
  {
    name: "LLM Config",
    href: "/dashboard/llm-config",
    icon: Brain,
    roles: ["OWNER", "ADMIN"],
  },
  {
    name: "LLM Training",
    href: "/dashboard/training",
    icon: GraduationCap,
    roles: ["OWNER", "ADMIN"],
  },
  {
    name: "Playground",
    href: "/dashboard/playground",
    icon: Play,
    roles: ["OWNER", "ADMIN", "AGENT"],
  },
  {
    name: "Users",
    href: "/dashboard/users",
    icon: Users,
    roles: ["OWNER", "ADMIN"],
  },
  {
    name: "Company",
    href: "/dashboard/company",
    icon: Building,
    roles: ["OWNER"],
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["OWNER", "ADMIN", "AGENT"],
  },
];

export function AppSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const userRole = session?.user?.role;
  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(userRole as string)
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <LayoutDashboard className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    Bot Dashboard
                  </span>
                  <span className="truncate text-xs">
                    {session?.user?.companyName || "Facebook Bot"}
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || "User"} />
                    <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      {session?.user?.name?.charAt(0) ||
                        session?.user?.email?.charAt(0) ||
                        "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {session?.user?.name || "User"}
                    </span>
                    <span className="truncate text-xs">
                      {session?.user?.email}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="top"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem className="gap-2" asChild>
                  <button className="w-full" onClick={() => signOut()}>
                    <LogOut className="size-4" />
                    <span>Log out</span>
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
