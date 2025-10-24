export function bindHorizontalIntentScroll(container: HTMLElement, thresholdRatio = 1.2) {
  if (typeof window === "undefined") {
    return;
  }

  const onWheel = (event: WheelEvent) => {
    const absX = Math.abs(event.deltaX);
    const absY = Math.abs(event.deltaY);
    const mostlyHorizontal = absX > absY * thresholdRatio;

    const atStart = container.scrollLeft <= 0;
    const atEnd = Math.ceil(container.scrollLeft + container.clientWidth) >= container.scrollWidth;

    if (!mostlyHorizontal) {
      return;
    }

    const delta = absX >= absY ? event.deltaX : event.deltaY;
    const goingLeft = delta < 0;
    const goingRight = delta > 0;

    if ((goingLeft && atStart) || (goingRight && atEnd)) {
      return;
    }

    event.preventDefault();
    container.scrollLeft += delta;
  };

  container.addEventListener("wheel", onWheel as EventListener, { passive: false });
}
