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
  Brain,
  Play,
  ChevronUp,
  Zap,
  Facebook,
  Instagram,
  Send,
  Globe,
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

// Navigation structure with groups
const navigationGroups = [
  {
    label: null, // Dashboard has no group label
    items: [
      {
        name: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["OWNER", "ADMIN", "AGENT"],
      },
    ],
  },
  {
    label: "MESSAGING",
    emoji: "💬",
    items: [
      {
        name: "Conversations",
        href: "/dashboard/conversations",
        icon: MessageSquare,
        roles: ["OWNER", "ADMIN", "AGENT"],
      },
      {
        name: "Canned Responses",
        href: "/dashboard/canned-responses",
        icon: Zap,
        roles: ["OWNER", "ADMIN", "AGENT"],
      },
    ],
  },
  {
    label: "INTEGRATIONS",
    emoji: "🔌",
    items: [
      {
        name: "Facebook Pages",
        href: "/dashboard/integrations/facebook/manage",
        icon: Facebook,
        roles: ["OWNER", "ADMIN"],
      },
      {
        name: "Instagram Accounts",
        href: "/dashboard/integrations/instagram/manage",
        icon: Instagram,
        roles: ["OWNER", "ADMIN"],
      },
      {
        name: "Telegram Bots",
        href: "/dashboard/integrations/telegram/manage",
        icon: Send,
        roles: ["OWNER", "ADMIN"],
      },
      {
        name: "Chat Widget",
        href: "/dashboard/integrations",
        icon: Globe,
        roles: ["OWNER", "ADMIN"],
      },
    ],
  },
  {
    label: "AI ASSISTANT",
    emoji: "🤖",
    items: [
      {
        name: "Bot Settings",
        href: "/dashboard/llm-config",
        icon: Brain,
        roles: ["OWNER", "ADMIN"],
      },
      {
        name: "Train Knowledge",
        href: "/dashboard/training",
        icon: GraduationCap,
        roles: ["OWNER", "ADMIN"],
      },
      {
        name: "Test Playground",
        href: "/dashboard/playground",
        icon: Play,
        roles: ["OWNER", "ADMIN", "AGENT"],
      },
    ],
  },
  {
    label: "WORKSPACE",
    emoji: "👥",
    items: [
      {
        name: "Team Members",
        href: "/dashboard/company",
        icon: Users,
        roles: ["OWNER", "ADMIN"],
      },
      {
        name: "Company Profile",
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
    ],
  },
];

export function AppSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const userRole = session?.user?.role;

  // Filter groups based on user role
  const filteredGroups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.roles.includes(userRole as string)
      ),
    }))
    .filter((group) => group.items.length > 0); // Remove empty groups

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
                  <span className="truncate font-semibold">ChatBridge</span>
                  <span className="truncate text-xs">
                    {session?.user?.companyName || "Messaging Platform"}
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {filteredGroups.map((group, groupIndex) => (
          <SidebarGroup key={groupIndex}>
            {group.label && (
              <SidebarGroupLabel>
                {group.emoji && <span className="mr-2">{group.emoji}</span>}
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.name}
                      >
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
        ))}
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
                    <AvatarImage
                      src={session?.user?.image || ""}
                      alt={session?.user?.name || "User"}
                    />
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
