import React, { useEffect, useRef } from "react";
import { Badge, IconButton, Tooltip } from "@mui/material";
import { Bell } from "lucide-react";
import { useNotifications } from "../../hooks/useNotifications";

const NotificationBadge = ({ onClick }) => {
    const { badgeCount, refetch } = useNotifications();
    const originalFaviconRef = useRef(null);

    // 🔁 Poll notifications
    useEffect(() => {
        refetch();
        const interval = setInterval(() => {
            refetch();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    // 🎯 Handle favicon badge
    useEffect(() => {
        let favicon =
            document.querySelector("link[rel='icon']") ||
            document.querySelector("link[rel='shortcut icon']");

        if (!favicon) {
            favicon = document.createElement("link");
            favicon.rel = "icon";
            document.head.appendChild(favicon);
        }

        // Store original favicon once
        if (!originalFaviconRef.current) {
            originalFaviconRef.current = favicon.href || "/favicon.ico";
        }

        // ✅ FIX: Reset favicon when badgeCount = 0
        if (badgeCount === 0) {
            favicon.href = originalFaviconRef.current;
            return;
        }

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = originalFaviconRef.current;

        img.onload = () => {
            const size = 64;
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");

            ctx.clearRect(0, 0, size, size);
            ctx.drawImage(img, 0, 0, size, size);

            const text = badgeCount > 99 ? "99+" : String(badgeCount);
            const isLong = text.length > 1;

            const badgeRadius = 18;
            const badgePadding = isLong ? 6 : 0;
            const badgeWidth = isLong
                ? badgeRadius * 2 + badgePadding * 2
                : badgeRadius * 2;

            const bx = size - badgeWidth / 2 - 2;
            const by = badgeRadius + 2;

            // White border
            ctx.beginPath();
            if (isLong) {
                const r = badgeRadius;
                ctx.moveTo(bx - badgeWidth / 2 + r, by - r - 2);
                ctx.lineTo(bx + badgeWidth / 2 - r, by - r - 2);
                ctx.arcTo(bx + badgeWidth / 2 + 2, by - r - 2, bx + badgeWidth / 2 + 2, by, r + 2);
                ctx.arcTo(bx + badgeWidth / 2 + 2, by + r + 2, bx + badgeWidth / 2 - r, by + r + 2, r + 2);
                ctx.lineTo(bx - badgeWidth / 2 + r, by + r + 2);
                ctx.arcTo(bx - badgeWidth / 2 - 2, by + r + 2, bx - badgeWidth / 2 - 2, by, r + 2);
                ctx.arcTo(bx - badgeWidth / 2 - 2, by - r - 2, bx - badgeWidth / 2 + r, by - r - 2, r + 2);
            } else {
                ctx.arc(bx, by, badgeRadius + 2, 0, Math.PI * 2);
            }
            ctx.fillStyle = "#ffffff";
            ctx.fill();

            // Red badge
            ctx.beginPath();
            if (isLong) {
                const r = badgeRadius;
                ctx.moveTo(bx - badgeWidth / 2 + r, by - r);
                ctx.lineTo(bx + badgeWidth / 2 - r, by - r);
                ctx.arcTo(bx + badgeWidth / 2, by - r, bx + badgeWidth / 2, by, r);
                ctx.arcTo(bx + badgeWidth / 2, by + r, bx + badgeWidth / 2 - r, by + r, r);
                ctx.lineTo(bx - badgeWidth / 2 + r, by + r);
                ctx.arcTo(bx - badgeWidth / 2, by + r, bx - badgeWidth / 2, by, r);
                ctx.arcTo(bx - badgeWidth / 2, by - r, bx - badgeWidth / 2 + r, by - r, r);
            } else {
                ctx.arc(bx, by, badgeRadius, 0, Math.PI * 2);
            }
            ctx.fillStyle = "#e53e3e";
            ctx.fill();

            // Text
            ctx.fillStyle = "#ffffff";
            ctx.font = `bold ${isLong ? 20 : 24}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(text, bx, by + 1);

            favicon.href = canvas.toDataURL("image/png");
        };

        img.onerror = () => {
            // ✅ Also handle reset on error
            if (badgeCount === 0) {
                favicon.href = originalFaviconRef.current;
                return;
            }

            const size = 64;
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");

            ctx.beginPath();
            ctx.roundRect(0, 0, size, size, 10);
            ctx.fillStyle = "#3b82f6";
            ctx.fill();

            const text = badgeCount > 99 ? "99+" : String(badgeCount);
            const bx = size - 16;
            const by = 16;

            ctx.beginPath();
            ctx.arc(bx, by, 14, 0, Math.PI * 2);
            ctx.fillStyle = "#e53e3e";
            ctx.fill();

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 18px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(text, bx, by + 1);

            favicon.href = canvas.toDataURL("image/png");
        };
    }, [badgeCount]);

    return (
        <Tooltip
            title={`${badgeCount} notification${badgeCount !== 1 ? "s" : ""}`}
            arrow
        >
            <IconButton onClick={onClick}>
                <Badge
                    badgeContent={badgeCount}
                    color="error"
                    max={99}
                    sx={{
                        "& .MuiBadge-badge": {
                            fontSize: "0.65rem",
                            minWidth: 14,
                            height: 16,
                        },
                    }}
                >
                    <Bell size={22} />
                </Badge>
            </IconButton>
        </Tooltip>
    );
};

export default NotificationBadge;