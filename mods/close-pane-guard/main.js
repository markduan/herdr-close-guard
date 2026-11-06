// keys.json binds cmd-shift-w to "mod.open:close-pane-guard". With no agent in the
// pane, in any status, the pane closes without this dialog.

import { View, div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { agents, spaces, focused, run, props, closeOverlay, theme } from "herdr";

export default class ClosePaneGuard extends View {
  init(_props, cx) {
    this.overlay = props()?.overlay ?? null;
    const f = this.overlay ? focused() : null;
    // A focused layout terminal block has no pane, and pane.close without a pane fails there.
    this.pane = f?.pane ?? null;
    this.tab = f?.tab ?? null;
    this.space = f?.space ?? null;
    this.handle = cx.focus_handle();
    if (this.held().length === 0) {
      if (this.overlay) closeOverlay(this.overlay);
      if (this.pane) this.closeTarget(false);
      return;
    }
    this.handle.focus();
  }

  held() {
    return this.pane ? agents().filter((a) => a.pane === this.pane) : [];
  }

  tabInfo() {
    const space = spaces().find((s) => s.id === this.space);
    return { space, tab: space?.tabs.find((t) => t.id === this.tab) };
  }

  // pane.close on a tab's only pane closes the tab without asking, so that case
  // goes through tab.close, which asks before the last tab takes its space with it.
  closeTarget(confirmed) {
    const { tab } = this.tabInfo();
    if (tab && tab.panes === 1) run("tab.close", confirmed ? { id: this.tab, confirmed: true } : { id: this.tab });
    else run("pane.close", { pane: this.pane });
  }

  yes() {
    closeOverlay(this.overlay);
    this.closeTarget(true);
  }

  render(_cx) {
    const held = this.held();
    if (!this.pane) return div();
    const t = theme();
    const n = held.length;
    const { space, tab } = this.tabInfo();
    const onlyPane = tab ? tab.panes === 1 : false;
    const lastTab = space ? space.tabs.length === 1 : false;
    const title = n === 1 ? "Close pane with 1 agent?" : `Close pane with ${n} agents?`;
    const button = (id, label, bg, fg, onClick) =>
      h_flex().id(id).h(32).px(14).items_center().rounded(8).border_1().border_color(id === "no" ? t.input : bg).bg(bg).text_color(fg).cursor_pointer().hover((s) => s.opacity(0.88)).on_click(onClick).child(label);
    return v_flex()
      .id("close-pane-guard")
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
          .when(onlyPane, (el) => el.child(div().text_color(t.foreground).child(lastTab ? "This is the only pane of the last tab, so its tab and space close too." : "This is the only pane, so its tab closes too."))),
      )
      .child(
        h_flex()
          .justify_end()
          .gap(8)
          .text_size(12)
          .child(button("no", "Cancel", t.raised, t.foreground, () => closeOverlay(this.overlay)))
          .child(button("yes", "Close pane", t.solid, t.solid_foreground, () => this.yes())),
      );
  }
}
