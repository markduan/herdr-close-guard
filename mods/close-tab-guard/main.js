// keys.json binds cmd-w to "mod.open:close-tab-guard". With no agent in the tab,
// in any status, the tab closes without this dialog.

import { View, div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { agents, spaces, focused, run, props, closeOverlay, theme } from "herdr";

export default class CloseTabGuard extends View {
  init(_props, cx) {
    this.overlay = props()?.overlay ?? null;
    const f = this.overlay ? focused() : null;
    this.tab = f?.tab ?? null;
    this.space = f?.space ?? null;
    this.handle = cx.focus_handle();
    if (this.held().length === 0) {
      if (this.overlay) closeOverlay(this.overlay);
      // Without `confirmed`, Herdr still asks before the last tab takes its space with it.
      if (this.tab) run("tab.close", { id: this.tab });
      return;
    }
    this.handle.focus();
  }

  held() {
    return this.tab ? agents().filter((a) => a.tab === this.tab) : [];
  }

  lastTabInSpace() {
    const space = spaces().find((s) => s.id === this.space);
    return space ? space.tabs.length === 1 : false;
  }

  yes() {
    closeOverlay(this.overlay);
    run("tab.close", { id: this.tab, confirmed: true });
  }

  render(_cx) {
    const held = this.held();
    if (!this.tab) return div();
    const t = theme();
    const n = held.length;
    const title = n === 1 ? "Close tab with 1 agent?" : `Close tab with ${n} agents?`;
    const button = (id, label, bg, fg, onClick) =>
      h_flex().id(id).h(32).px(14).items_center().rounded(8).border_1().border_color(id === "no" ? t.input : bg).bg(bg).text_color(fg).cursor_pointer().hover((s) => s.opacity(0.88)).on_click(onClick).child(label);
    return v_flex()
      .id("close-tab-guard")
      .track_focus(this.handle)
      .on_key_down((e, cx) => {
        if (e.key === "enter") this.yes();
        else if (e.key === "escape") closeOverlay(this.overlay);
        else return;
        cx.stop_propagation();
      })
      .size_full()
      .min_h(0)
      .p(18)
      .gap(12)
      .bg(t.popover)
      .text_size(13)
      .child(h_flex().items_center().child(div().flex_1().text_size(15).font_semibold().text_color(t.foreground).child(title)).child(div().text_size(11).text_color(t.dim).child("Esc")))
      .child(
        v_flex()
          .id("agents")
          .flex_1()
          .min_h(0)
          .gap(4)
          .overflow_y_scrollbar()
          .text_color(t.muted)
          .children(held.map((a) => div().child(`${a.program.name}: ${a.title} (${a.status})`)))
          .when(this.lastTabInSpace(), (el) => el.child(div().text_color(t.foreground).child("This is the last tab, so its space closes too."))),
      )
      .child(
        h_flex()
          .justify_end()
          .gap(8)
          .text_size(12)
          .child(button("no", "Cancel", t.raised, t.foreground, () => closeOverlay(this.overlay)))
          .child(button("yes", "Close tab", t.solid, t.solid_foreground, () => this.yes())),
      );
  }
}
