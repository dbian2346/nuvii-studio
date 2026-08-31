import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { Panel } from "@/components/ui/panel";
import type { EditorTool } from "../domain/types";
import styles from "./editor.module.css";

const iconRoot = "/icons/nuvii";

interface ToolSidebarProps {
  activeTool: EditorTool;
  onSelectTool: (tool: EditorTool) => void;
}

export function ToolSidebar({ activeTool, onSelectTool }: ToolSidebarProps) {
  return (
    <Panel aria-label="Design tools" className={styles.toolSidebar}>
      <div className={styles.toolGroup}>
        <IconButton
          aria-label="Nail properties"
          onClick={() => onSelectTool("properties")}
          selected={activeTool === "properties"}
          size="tool"
        >
          <Icon size="large" src={`${iconRoot}/cursor.svg`} />
        </IconButton>
        <IconButton
          aria-label="Open asset browser"
          onClick={() => onSelectTool("assets")}
          selected={activeTool === "assets"}
          size="tool"
        >
          <Icon size="large" src={`${iconRoot}/folder.svg`} />
        </IconButton>
        <IconButton
          aria-label="Open layers"
          onClick={() => onSelectTool("layers")}
          selected={activeTool === "layers"}
          size="tool"
        >
          <Icon size="large" src={`${iconRoot}/layers.svg`} />
        </IconButton>
        <IconButton
          aria-label="Open Nuvii AI design builder"
          onClick={() => onSelectTool("ai")}
          selected={activeTool === "ai"}
          size="tool"
        >
          <Icon size="large" src={`${iconRoot}/magic-wand.svg`} />
        </IconButton>
      </div>
    </Panel>
  );
}
