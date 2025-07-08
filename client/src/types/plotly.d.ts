declare module 'plotly.js-dist-min' {
  namespace Plotly {
    interface Data {
      x: any[];
      y: any[];
      type: string;
      name?: string;
      marker?: {
        color: string;
      };
      text?: any[];
      textposition?: string;
      hovertemplate?: string;
    }

    interface Layout {
      margin?: {
        t: number;
        b: number;
        l: number;
        r: number;
      };
      height?: number;
      font?: {
        family: string;
      };
      xaxis?: {
        title?: string;
        titlefont?: {
          family: string;
          size: number;
        };
        tickmode?: string;
        tickvals?: any[];
      };
      yaxis?: {
        title?: string;
        titlefont?: {
          family: string;
          size: number;
        };
        range?: number[];
      };
      barmode?: string;
      bargap?: number;
      showlegend?: boolean;
      legend?: {
        x?: number;
        y?: number;
        orientation?: string;
      };
    }

    function newPlot(
      element: HTMLElement,
      data: Data[],
      layout: Partial<Layout>,
      options?: any
    ): void;

    function purge(element: HTMLElement): void;

    function toImage(
      element: HTMLElement,
      options: { format: string; width: number; height: number }
    ): Promise<string>;
  }

  const Plotly: typeof Plotly;
  export = Plotly;
}