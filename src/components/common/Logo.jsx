import React, { useState } from "react";
import { Flex, Typography } from "antd";
import { useTheme } from '../../contexts/ThemeContext';
import datacoreLogo from "../../assets/datacore-logo.png";
import datacoreLogoWhite from "../../assets/datacore-logo-white.png";

const { Text } = Typography;

export default function Logo({
  showText = true,
  size = "medium",
  style = {},
  imageStyle = {},
}) {
  const { isDarkMode } = useTheme();
  const [imageError, setImageError] = useState(false);

  const sizes = {
    small: { maxWidth: "120px", maxHeight: "40px" },
    medium: { maxWidth: "200px", maxHeight: "60px" },
    large: { maxWidth: "280px", maxHeight: "80px" },
  };

  const logoSrc = isDarkMode ? datacoreLogoWhite : datacoreLogo;

  const handleImageError = () => {
    setImageError(true);
  };

  // Fallback component when image fails to load
  const FallbackLogo = () => (
    <Flex vertical align="center">
      <Flex
        align="center"
        justify="center"
        style={{
          width: "40px",
          height: "40px",
          background: isDarkMode ? "#333" : "#fff",
          borderRadius: "8px",
          marginBottom: showText ? "8px" : 0,
          fontSize: "20px",
          fontWeight: "bold",
          color: isDarkMode ? "#8bc9e1" : "#277c90",
          border: `2px solid ${isDarkMode ? "#8bc9e1" : "#277c90"}`,
        }}
      >
        DC
      </Flex>
      {showText && (
        <>
          <Text
            strong
            style={{
              color: isDarkMode ? "#fff" : "#1f2937",
              fontSize: "18px",
              fontWeight: "600",
              fontFamily: "'Montserrat', sans-serif",
              textAlign: "center",
            }}
          >
            DATACORE
          </Text>
          <Text
            style={{
              color: isDarkMode
                ? "rgba(255, 255, 255, 0.8)"
                : "rgba(0, 0, 0, 0.65)",
              fontSize: "12px",
              fontFamily: "'Montserrat', sans-serif",
              textAlign: "center",
            }}
          >
            AI FORGE v1.0
          </Text>
        </>
      )}
    </Flex>
  );

  if (imageError) {
    return <FallbackLogo />;
  }

  return (
    <Flex align="center" justify="center" style={style}>
      <img
        src={logoSrc}
        alt="DATACORE AI FORGE"
        style={{
          ...sizes[size],
          objectFit: "contain",
          ...imageStyle,
        }}
        onError={handleImageError}
      />
    </Flex>
  );
}
