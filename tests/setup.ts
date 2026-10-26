// Phaser がモジュール読み込み時に実行する canvas 2D 簡易モック
if (typeof HTMLCanvasElement !== "undefined") {
  const dummyContext = {
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData: () => {},
    createImageData: () => ({ data: new Uint8ClampedArray(4) }),
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    fillText: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    fill: () => {},
    globalCompositeOperation: "source-over",
  };

  HTMLCanvasElement.prototype.getContext = function (contextType: string) {
    if (contextType === "2d") {
      return dummyContext as unknown as CanvasRenderingContext2D;
    }
    return null;
  } as typeof HTMLCanvasElement.prototype.getContext;
}
