/**
 * DrawingTools.js — Interactive Manual Technical Drawing Tools Manager.
 * Manages horizontal lines, trendlines, rays, rectangles, Fibonacci retracements, and text labels.
 */

export class DrawingTools {
  constructor(canvas) {
    this.canvas = canvas;
    this.drawings = [];
    this.activeTool = 'SELECT'; // 'SELECT' | 'HLINE' | 'TRENDLINE' | 'RECT' | 'FIB' | 'TEXT'
  }

  setTool(toolName) {
    this.activeTool = toolName;
  }

  addDrawing(drawing) {
    this.drawings.push({
      id: `draw-${Date.now()}`,
      tool: this.activeTool,
      ...drawing
    });
  }

  clearDrawings() {
    this.drawings = [];
  }
}
