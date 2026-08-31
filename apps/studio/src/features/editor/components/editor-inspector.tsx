import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ColorSwatch } from "@/components/ui/color-swatch";
import { Icon } from "@/components/ui/icon";
import { PropertyRow } from "@/components/ui/property-row";
import {
  COLOR_OPTIONS,
  FINISH_OPTIONS,
  LENGTH_OPTIONS,
  SHAPE_OPTIONS,
} from "../domain/editor-data";
import type {
  EditableNailProperty,
  InspectorSection,
  Nail,
  NailAppearancePatch,
} from "../domain/types";
import { ShapeGlyph } from "./nail-surface";
import styles from "./editor.module.css";

const iconRoot = "/icons/nuvii";

interface EditorInspectorProps {
  activeSection: InspectorSection;
  nail: Nail;
  onApplyToAll: (property: EditableNailProperty) => void;
  onSelectSection: (section: InspectorSection) => void;
  onUpdateNail: (patch: NailAppearancePatch) => void;
}

function OptionButton({
  children,
  label,
  onClick,
  selected,
}: {
  children?: ReactNode;
  label: string;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <button
      aria-pressed={selected}
      className={styles.optionButton}
      onClick={onClick}
      type="button"
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

function ApplyToAll({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button className={styles.applyButton} onClick={onClick} variant="ghost">
      {label}
    </Button>
  );
}

function FillControls({
  nail,
  onApplyToAll,
  onUpdateNail,
}: Pick<EditorInspectorProps, "nail" | "onApplyToAll" | "onUpdateNail">) {
  return (
    <div className={styles.inspectorControls}>
      <div className={styles.controlGroup}>
        <p className={styles.controlLabel}>Base colour</p>
        <label className={styles.baseColourField}>
          <span
            aria-hidden="true"
            className={styles.baseColourPreview}
            style={{ backgroundColor: nail.baseColor }}
          />
          <span>HEX {nail.baseColor.toUpperCase()}</span>
          <Icon size="large" src={`${iconRoot}/edit.svg`} />
          <input
            aria-label="Choose a custom base colour"
            onChange={(event) => onUpdateNail({ baseColor: event.target.value })}
            type="color"
            value={nail.baseColor}
          />
        </label>
      </div>

      <div className={styles.controlGroup}>
        <p className={styles.controlLabel}>Recent colours</p>
        <div aria-label="Recent colours" className={styles.swatchRow} role="group">
          {COLOR_OPTIONS.map((color) => (
            <ColorSwatch
              aria-label={`Use ${color.name}`}
              color={color.value}
              key={color.value}
              onClick={() => onUpdateNail({ baseColor: color.value })}
              selected={nail.baseColor.toLowerCase() === color.value}
            />
          ))}
          <label className={styles.addSwatch} title="Choose a custom colour">
            <Icon size="medium" src={`${iconRoot}/add.svg`} />
            <input
              aria-label="Add a custom colour"
              onChange={(event) => onUpdateNail({ baseColor: event.target.value })}
              type="color"
              value={nail.baseColor}
            />
          </label>
        </div>
      </div>

      <ApplyToAll
        label="Apply colour to all nails"
        onClick={() => onApplyToAll("baseColor")}
      />
    </div>
  );
}

function ShapeAndLengthControls({
  nail,
  onApplyToAll,
  onUpdateNail,
}: Pick<EditorInspectorProps, "nail" | "onApplyToAll" | "onUpdateNail">) {
  return (
    <div className={styles.inspectorControls}>
      <fieldset className={styles.controlGroup}>
        <legend className={styles.controlLabel}>Nail shape</legend>
        <div className={styles.shapeGrid}>
          {SHAPE_OPTIONS.map((option) => (
            <OptionButton
              key={option.value}
              label={option.label}
              onClick={() => onUpdateNail({ shape: option.value })}
              selected={nail.shape === option.value}
            >
              <ShapeGlyph shape={option.value} />
            </OptionButton>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.controlGroup}>
        <legend className={styles.controlLabel}>Nail length</legend>
        <div className={styles.lengthGrid}>
          {LENGTH_OPTIONS.map((option) => (
            <OptionButton
              key={option.value}
              label={option.label}
              onClick={() => onUpdateNail({ length: option.value })}
              selected={nail.length === option.value}
            />
          ))}
        </div>
      </fieldset>

      <div className={styles.applyStack}>
        <ApplyToAll
          label="Apply shape to all nails"
          onClick={() => onApplyToAll("shape")}
        />
        <ApplyToAll
          label="Apply length to all nails"
          onClick={() => onApplyToAll("length")}
        />
      </div>
    </div>
  );
}

function FinishControls({
  nail,
  onApplyToAll,
  onUpdateNail,
}: Pick<EditorInspectorProps, "nail" | "onApplyToAll" | "onUpdateNail">) {
  return (
    <div className={styles.inspectorControls}>
      <fieldset className={styles.controlGroup}>
        <legend className={styles.controlLabel}>Surface finish</legend>
        <div className={styles.finishGrid}>
          {FINISH_OPTIONS.map((option) => (
            <OptionButton
              key={option.value}
              label={option.label}
              onClick={() => onUpdateNail({ finish: option.value })}
              selected={nail.finish === option.value}
            >
              <span
                aria-hidden="true"
                className={`${styles.finishSample} ${styles[option.value]}`}
              />
            </OptionButton>
          ))}
        </div>
      </fieldset>
      <ApplyToAll
        label="Apply finish to all nails"
        onClick={() => onApplyToAll("finish")}
      />
    </div>
  );
}

export function EditorInspector({
  activeSection,
  nail,
  onApplyToAll,
  onSelectSection,
  onUpdateNail,
}: EditorInspectorProps) {
  return (
    <aside aria-labelledby="properties-title" className={styles.inspector}>
      <div className={styles.inspectorHeader}>
        <Icon size="medium" src={`${iconRoot}/sliders.svg`} />
        <div>
          <h2 id="properties-title">Properties</h2>
          <p>Editing - {nail.label}</p>
        </div>
      </div>

      <div className={styles.inspectorDivider} />

      <nav aria-label="Property categories" className={styles.propertyNavigation}>
        <PropertyRow
          icon={<Icon size="medium" src={`${iconRoot}/fill.svg`} />}
          label="Fill"
          onClick={() => onSelectSection("fill")}
          selected={activeSection === "fill"}
        />
        <PropertyRow
          icon={<Icon size="medium" src={`${iconRoot}/sparkle.svg`} />}
          label="Finish"
          onClick={() => onSelectSection("finish")}
          selected={activeSection === "finish"}
        />
        <PropertyRow
          icon={<Icon size="medium" src={`${iconRoot}/opacity.svg`} />}
          label="Shape & length"
          onClick={() => onSelectSection("shape")}
          selected={activeSection === "shape"}
        />
      </nav>

      {activeSection === "fill" ? (
        <FillControls
          nail={nail}
          onApplyToAll={onApplyToAll}
          onUpdateNail={onUpdateNail}
        />
      ) : null}
      {activeSection === "shape" ? (
        <ShapeAndLengthControls
          nail={nail}
          onApplyToAll={onApplyToAll}
          onUpdateNail={onUpdateNail}
        />
      ) : null}
      {activeSection === "finish" ? (
        <FinishControls
          nail={nail}
          onApplyToAll={onApplyToAll}
          onUpdateNail={onUpdateNail}
        />
      ) : null}
    </aside>
  );
}
