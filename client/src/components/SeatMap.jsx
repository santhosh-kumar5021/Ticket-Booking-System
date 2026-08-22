import React, { useMemo, useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";

export function SeatMap({
  seats = [],
  selectedSeatIds = [],
  onToggleSeat,
  venueLayoutConfig = {},
  pricingTiers = {},
  currentUserId,
}) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hoveredSeat, setHoveredSeat] = useState(null);

  /*
   * ------------------------------------------------------------
   * ROW CONFIGURATION
   * ------------------------------------------------------------
   *
   * A-D  : BALCONY
   * E-F  : PREMIUM
   * G-J  : EXECUTIVE / HIGHER
   *
   * You can easily change these later.
   */

  const rowConfig = {
    A: {
      category: "BALCONY",
      price: pricingTiers.BALCONY || 40,
    },
    B: {
      category: "BALCONY",
      price: pricingTiers.BALCONY || 40,
    },
    C: {
      category: "BALCONY",
      price: pricingTiers.BALCONY || 40,
    },
    D: {
      category: "BALCONY",
      price: pricingTiers.BALCONY || 40,
    },

    E: {
      category: "PREMIUM",
      price: pricingTiers.PREMIUM || 60,
    },
    F: {
      category: "PREMIUM",
      price: pricingTiers.PREMIUM || 60,
    },

    G: {
      category: "EXECUTIVE",
      price: pricingTiers.EXECUTIVE || 80,
    },
    H: {
      category: "EXECUTIVE",
      price: pricingTiers.EXECUTIVE || 80,
    },
    I: {
      category: "EXECUTIVE",
      price: pricingTiers.EXECUTIVE || 80,
    },
    J: {
      category: "EXECUTIVE",
      price: pricingTiers.EXECUTIVE || 80,
    },
  };

  /*
   * ------------------------------------------------------------
   * GROUP SEATS
   * ------------------------------------------------------------
   *
   * IMPORTANT:
   * We do NOT use seat.x / seat.y.
   *
   * Position is generated from:
   *      row index
   *      seat number
   *
   * This prevents overlapping seats.
   */

  const rows = useMemo(() => {
    const grouped = {};

    Object.keys(rowConfig).forEach((row) => {
      grouped[row] = [];
    });

    seats.forEach((seat) => {
      const row = String(seat.row || "").toUpperCase();

      if (!grouped[row]) {
        grouped[row] = [];
      }

      grouped[row].push(seat);
    });

    Object.keys(grouped).forEach((row) => {
      grouped[row].sort(
        (a, b) => Number(a.number) - Number(b.number)
      );
    });

    return grouped;
  }, [seats]);

  /*
   * ------------------------------------------------------------
   * CONSTANTS
   * ------------------------------------------------------------
   */

  const seatRadius = 15;

  // Distance between seats
  const seatGap = 46;

  // Larger gap in the middle to create aisle
  const aisleGap = 28;

  // Distance between rows
  const rowGap = 48;

  const leftPadding = 100;
  const rightPadding = 70;
  const topPadding = 75;
  const bottomPadding = 80;

  const maxSeats = Math.max(
    12,
    ...Object.values(rows).map((row) => row.length)
  );

  /*
   * 12 seats:
   *
   * 1 2 3 4 5 6   7 8 9 10 11 12
   *
   *                    ^
   *                 AISLE
   */

  const calculateSeatX = (seatNumber) => {
    const number = Number(seatNumber);

    let x =
      leftPadding +
      (number - 1) * seatGap;

    if (number > 6) {
      x += aisleGap;
    }

    return x;
  };

  const calculateRowY = (rowIndex) => {
    return topPadding + rowIndex * rowGap;
  };

  const svgWidth =
    leftPadding +
    (maxSeats - 1) * seatGap +
    aisleGap +
    rightPadding;

  const svgHeight =
    topPadding +
    Object.keys(rowConfig).length * rowGap +
    bottomPadding;

  /*
   * ------------------------------------------------------------
   * SEAT STYLE
   * ------------------------------------------------------------
   */

  const getSeatStyle = (seat, row) => {
    const isSelected = selectedSeatIds.includes(seat.id);

    if (isSelected) {
      return {
        fill: "#f84464",
        stroke: "#ffffff",
        strokeWidth: 2,
        opacity: 1,
        cursor: "pointer",
      };
    }

    if (seat.status === "BOOKED") {
      return {
        fill: "var(--seat-booked)",
        stroke: "var(--text-muted)",
        strokeWidth: 1,
        opacity: 0.5,
        cursor: "not-allowed",
      };
    }

    if (seat.status === "HELD") {
      if (seat.isHeldByMe) {
        return {
          fill: "var(--seat-held-me)",
          stroke: "var(--border-focus)",
          strokeWidth: 2,
          opacity: 1,
          cursor: "pointer",
        };
      }

      return {
        fill: "var(--seat-held)",
        stroke: "var(--accent-amber)",
        strokeWidth: 1.5,
        opacity: 0.75,
        cursor: "not-allowed",
      };
    }

    /*
     * BOOKMYSHOW STYLE:
     *
     * Available = green
     */

    return {
      fill: "var(--seat-available)",
      stroke: "var(--border-subtle)",
      strokeWidth: 1.5,
      opacity: 1,
      cursor: "pointer",
    };
  };

  /*
   * ------------------------------------------------------------
   * CLICK HANDLER
   * ------------------------------------------------------------
   */

  const handleSeatClick = (seat) => {
    const isSelected = selectedSeatIds.includes(seat.id);

    const clickable =
      seat.status === "AVAILABLE" ||
      seat.isHeldByMe ||
      isSelected;

    if (clickable && onToggleSeat) {
      onToggleSeat(seat);
    }
  };

  /*
   * ------------------------------------------------------------
   * GET DISPLAY PRICE
   * ------------------------------------------------------------
   */

  const getSeatPrice = (seat) => {
    const row = String(seat.row || "").toUpperCase();

    return (
      seat.price ||
      rowConfig[row]?.price ||
      pricingTiers.STANDARD ||
      30
    );
  };

  /*
   * ------------------------------------------------------------
   * RENDER
   * ------------------------------------------------------------
   */

  return (
    <div
      style={{
        width: "100%",
        background: "var(--bg-card)",
        borderRadius: 16,
        padding: 24,
        boxSizing: "border-box",
        color: "var(--text-primary)",
        overflow: "hidden",
        border: "1px solid var(--border-subtle)"
      }}
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          gap: 15,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Select Seats
          </h3>

          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: "var(--text-secondary)",
            }}
          >
            Choose your preferred seats
          </p>
        </div>

        {/* Zoom Controls */}

        <div
          style={{
            display: "flex",
            gap: 5,
            padding: 5,
            borderRadius: 8,
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <button
            onClick={() =>
              setZoomLevel((prev) =>
                Math.min(prev + 0.15, 1.7)
              )
            }
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              padding: 7,
              cursor: "pointer",
            }}
            title="Zoom In"
          >
            <ZoomIn size={17} />
          </button>

          <button
            onClick={() =>
              setZoomLevel((prev) =>
                Math.max(prev - 0.15, 0.7)
              )
            }
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              padding: 7,
              cursor: "pointer",
            }}
            title="Zoom Out"
          >
            <ZoomOut size={17} />
          </button>

          <button
            onClick={() => setZoomLevel(1)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              padding: 7,
              cursor: "pointer",
            }}
            title="Reset"
          >
            <RotateCcw size={17} />
          </button>
        </div>
      </div>

      {/* =====================================================
          SCREEN
      ===================================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 40,
        }}
      >
        <div
          style={{
            width: "60%",
            minWidth: 300,
            maxWidth: 650,
            textAlign: "center",
          }}
        >
          <div
            style={{
              height: 8,
              borderRadius: "50%",
              background:
                "linear-gradient(90deg, transparent, #e2e8f0, transparent)",
              boxShadow:
                "0 0 25px rgba(255,255,255,0.45)",
            }}
          />

          <div
            style={{
              marginTop: 10,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 3,
              color: "#94a3b8",
            }}
          >
            {venueLayoutConfig.screenLabel ||
              "SCREEN THIS WAY"}
          </div>
        </div>
      </div>

      {/* =====================================================
          SEAT MAP
      ===================================================== */}

      <div
        style={{
          width: "100%",
          overflowX: "auto",
          overflowY: "hidden",
          borderRadius: 14,
          background: "var(--bg-primary)",
          border: "1px solid var(--border-subtle)",
          padding: "20px 10px",
          boxSizing: "border-box",
        }}
      >
        <svg
          width={svgWidth * zoomLevel}
          height={svgHeight * zoomLevel}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{
            display: "block",
            margin: "0 auto",
            transition: "all 0.2s ease",
          }}
        >
          {/* =================================================
              DEFINITIONS
          ================================================= */}

          <defs>
            {/* Available */}

            <radialGradient
              id="availableGradient"
              cx="35%"
              cy="30%"
            >
              <stop
                offset="0%"
                stopColor="#34d399"
              />

              <stop
                offset="100%"
                stopColor="#11966b"
              />
            </radialGradient>

            {/* Selected */}

            <radialGradient
              id="selectedGradient"
              cx="35%"
              cy="30%"
            >
              <stop
                offset="0%"
                stopColor="#ff6b85"
              />

              <stop
                offset="100%"
                stopColor="#e62f51"
              />
            </radialGradient>

            {/* Screen glow */}

            <filter id="screenGlow">
              <feGaussianBlur
                stdDeviation="5"
                result="blur"
              />

              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* =================================================
              AISLE
          ================================================= */}

          <text
            x={svgWidth / 2}
            y={topPadding - 25}
            textAnchor="middle"
            fill="#475569"
            fontSize="9"
            fontWeight="600"
            letterSpacing="2"
          >
            AISLE
          </text>

          {/* =================================================
              ROWS
          ================================================= */}

          {Object.keys(rowConfig).map(
            (row, rowIndex) => {
              const rowSeats = rows[row] || [];
              const y = calculateRowY(rowIndex);

              const category =
                rowConfig[row]?.category ||
                "STANDARD";

              return (
                <g key={row}>
                  {/* Row label */}

                  <text
                    x={55}
                    y={y + 4}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="12"
                    fontWeight="700"
                  >
                    {row}
                  </text>

                  {/* Category label */}

                  {row === "A" && (
                    <text
                      x={svgWidth - 30}
                      y={y + 4}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="8"
                      fontWeight="600"
                    >
                      BALCONY
                    </text>
                  )}

                  {row === "E" && (
                    <text
                      x={svgWidth - 30}
                      y={y + 4}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="8"
                      fontWeight="600"
                    >
                      PREMIUM
                    </text>
                  )}

                  {row === "G" && (
                    <text
                      x={svgWidth - 30}
                      y={y + 4}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="8"
                      fontWeight="600"
                    >
                      EXECUTIVE
                    </text>
                  )}

                  {/* Seats */}

                  {rowSeats.map((seat) => {
                    const number = Number(seat.number);

                    const x =
                      calculateSeatX(number);

                    const style =
                      getSeatStyle(
                        seat,
                        row
                      );

                    const isSelected =
                      selectedSeatIds.includes(
                        seat.id
                      );

                    const isClickable =
                      seat.status ===
                      "AVAILABLE" ||
                      seat.isHeldByMe ||
                      isSelected;

                    return (
                      <g
                        key={seat.id}
                        onClick={() =>
                          handleSeatClick(seat)
                        }
                        onMouseEnter={() =>
                          setHoveredSeat(
                            seat
                          )
                        }
                        onMouseLeave={() =>
                          setHoveredSeat(
                            null
                          )
                        }
                        style={{
                          cursor:
                            style.cursor,
                        }}
                      >
                        {/* Selected glow */}

                        {isSelected && (
                          <circle
                            cx={x}
                            cy={y}
                            r={21}
                            fill="none"
                            stroke="#f84464"
                            strokeWidth="2"
                            opacity="0.35"
                          />
                        )}

                        {/* Seat */}

                        <circle
                          cx={x}
                          cy={y}
                          r={seatRadius}
                          fill={
                            isSelected
                              ? "url(#selectedGradient)"
                              : seat.status ===
                                "BOOKED"
                                ? "#475569"
                                : seat.status ===
                                  "HELD"
                                  ? "#b45309"
                                  : "url(#availableGradient)"
                          }
                          stroke={
                            isSelected
                              ? "#ffffff"
                              : seat.status ===
                                "BOOKED"
                                ? "#64748b"
                                : seat.status ===
                                  "HELD"
                                  ? "#f59e0b"
                                  : "#34d399"
                          }
                          strokeWidth={
                            isSelected
                              ? 2
                              : 1.2
                          }
                          opacity={
                            seat.status ===
                              "BOOKED"
                              ? 0.45
                              : 1
                          }
                        />

                        {/* Seat number */}

                        <text
                          x={x}
                          y={y + 4}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="700"
                          pointerEvents="none"
                        >
                          {number}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            }
          )}
        </svg>
      </div>

      {/* =====================================================
          HOVER INFORMATION
      ===================================================== */}

      {hoveredSeat && (
        <div
          style={{
            margin: "14px auto 0",
            width: "fit-content",
            maxWidth: "90%",
            background: "#111827",
            border: "1px solid #334155",
            borderRadius: 8,
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 12,
          }}
        >
          <span>
            Seat{" "}
            <strong>
              {hoveredSeat.row}-
              {hoveredSeat.number}
            </strong>
          </span>

          <span
            style={{
              width: 1,
              height: 16,
              background: "#334155",
            }}
          />

          <span>
            {rowConfig[
              String(
                hoveredSeat.row
              ).toUpperCase()
            ]?.category ||
              "STANDARD"}
          </span>

          <span
            style={{
              width: 1,
              height: 16,
              background: "#334155",
            }}
          />

          <strong
            style={{
              color: "#22c55e",
            }}
          >
            ₹{getSeatPrice(hoveredSeat)}
          </strong>
        </div>
      )}

      {/* =====================================================
          LEGEND
      ===================================================== */}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 22,
          marginTop: 24,
          paddingTop: 20,
          borderTop: "1px solid #1e293b",
          fontSize: 12,
          color: "#cbd5e1",
        }}
      >
        {/* Available */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "#1ea672",
              border: "1px solid #35c98b",
            }}
          />

          Available
        </div>

        {/* Selected */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "#f84464",
              border: "1px solid #ffffff",
            }}
          />

          Selected
        </div>

        {/* Held */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "#b45309",
              border: "1px solid #f59e0b",
            }}
          />

          Held
        </div>

        {/* Sold */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "#475569",
              opacity: 0.55,
            }}
          />

          Sold
        </div>
      </div>

      {/* =====================================================
          CATEGORY PRICES
      ===================================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 28,
          marginTop: 18,
          fontSize: 12,
          color: "#94a3b8",
        }}
      >
        <span>
          Balcony{" "}
          <strong style={{ color: "#22c55e" }}>
            ₹{pricingTiers.BALCONY || 40}
          </strong>
        </span>

        <span>
          Premium{" "}
          <strong style={{ color: "#22c55e" }}>
            ₹{pricingTiers.PREMIUM || 60}
          </strong>
        </span>

        <span>
          Executive{" "}
          <strong style={{ color: "#22c55e" }}>
            ₹{pricingTiers.EXECUTIVE || 80}
          </strong>
        </span>
      </div>
    </div>
  );
}
