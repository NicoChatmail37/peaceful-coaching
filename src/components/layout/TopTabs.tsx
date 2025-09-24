import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Package, Settings } from "lucide-react";

interface TopTabsProps {
  value: string;
  onValueChange: (value: string) => void;
}

export const TopTabs = ({ value, onValueChange }: TopTabsProps) => {
  return (
    <div className="border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <Tabs value={value} onValueChange={onValueChange}>
          <TabsList className="h-12 bg-transparent border-none p-0">
            <TabsTrigger 
              value="jour" 
              className="h-12 px-6 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Jour
            </TabsTrigger>
            <TabsTrigger 
              value="catalogue" 
              className="h-12 px-6 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <Package className="h-4 w-4 mr-2" />
              Catalogue
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="h-12 px-6 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <Settings className="h-4 w-4 mr-2" />
              Paramètres
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
};