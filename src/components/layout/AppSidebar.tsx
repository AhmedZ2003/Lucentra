import { 
  BarChart3, 
  Users, 
  FileText, 
  Settings, 
  HelpCircle, 
  Moon, 
  Sun,
  Home,
  Car
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const navigationItems = [
  { title: "Overview", url: "/", icon: Home },
  { title: "Fleet Management", url: "/manager/dashboard", icon: Car },
  { title: "Driver Analytics", url: "/driver/dashboard", icon: Users },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

const bottomItems = [
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Help & Support", url: "/help", icon: HelpCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const currentPath = location.pathname;
  
  const collapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(path);
  };

  const getNavClassName = (path: string) => {
    const baseClasses = "w-full justify-start transition-all duration-200";
    if (isActive(path)) {
      return `${baseClasses} bg-primary/10 text-primary border-r-2 border-primary`;
    }
    return `${baseClasses} hover:bg-muted/50 text-muted-foreground hover:text-foreground`;
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Sidebar 
      className={`border-r border-border bg-card ${collapsed ? "w-16" : "w-64"}`}
      collapsible="icon"
    >
      <SidebarHeader className="p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-foreground">FleetScope</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "hidden" : ""}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavClassName(item.url)}
                      title={collapsed ? item.title : undefined}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="ml-3">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-8">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {bottomItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavClassName(item.url)}
                      title={collapsed ? item.title : undefined}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="ml-3">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <span className="text-sm text-muted-foreground">Dark Mode</span>
          )}
          <div className="flex items-center space-x-2">
            {!collapsed && <Sun className="h-4 w-4" />}
            <Switch
              checked={theme === "dark"}
              onCheckedChange={toggleTheme}
            />
            {!collapsed && <Moon className="h-4 w-4" />}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}