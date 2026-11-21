"use client";

import { OverlayTrigger, OverlayTriggerProps, Tooltip, TooltipProps } from "react-bootstrap";

function OverLay({
  children,
  string,
  placement = "right",
}: {
  children: React.ReactElement;
  string: string;
  // Por defecto a la derecha; en la última columna de una tabla conviene "top" o "left" para no salirse de la pantalla
  placement?: OverlayTriggerProps["placement"];
}) {
  const renderTooltip = (props: TooltipProps) => (
    <Tooltip id="button-tooltip" {...props}>
      {string}
    </Tooltip>
  );

  return (
    <OverlayTrigger
      placement={placement}
      delay={{ show: 250, hide: 400 }}
      overlay={renderTooltip}
    >
      {children}
    </OverlayTrigger>
  );
}

export default OverLay;
