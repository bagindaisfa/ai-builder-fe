// AntD theme configuration for DATACORE AI FORGE
const config = {
  token: {
    // Primary colors
    colorPrimary: '#277c90',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorInfo: '#3b82f6',
    
    // Background colors
    colorBgBase: '#ffffff',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#f8fafc',
    
    // Text colors
    colorTextBase: '#1f2937',
    colorTextSecondary: '#6b7280',
    colorTextTertiary: '#9ca3af',
    
    // Border and radius
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    
    // Typography
    fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,
    
    // Spacing
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    margin: 16,
    marginLG: 24,
    marginSM: 12,
    
    // Shadows
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
    boxShadowSecondary: '0 2px 8px rgba(0, 0, 0, 0.06)',
    
    // Control heights
    controlHeight: 40,
    controlHeightLG: 48,
    controlHeightSM: 32,
  },
  components: {
    Layout: {
      bodyBg: '#f8fafc',
      siderBg: '#ffffff',
      headerBg: '#ffffff',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: 'rgba(39, 124, 144, 0.15)',
      itemHoverBg: 'rgba(39, 124, 144, 0.1)',
      itemSelectedColor: '#277c90',
      itemHoverColor: '#277c90',
    },
    Card: {
      borderRadius: 12,
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
    },
    Button: {
      borderRadius: 8,
      primaryShadow: '0 2px 8px rgba(39, 124, 144, 0.3)',
    },
    Input: {
      borderRadius: 8,
    },
    Select: {
      borderRadius: 8,
      colorBorder: '#e5e7eb',
      colorPrimary: '#277c90',
    },
    Table: {
      borderRadius: 8,
      colorBgHeader: '#f8fafc',
      colorBorder: '#e5e7eb',
    },
    Upload: {
      borderRadius: 12,
      colorBorder: '#e5e7eb',
      colorPrimary: '#277c90',
    },
    Badge: {
      colorSuccess: '#10b981',
      colorWarning: '#f59e0b',
      colorError: '#ef4444',
    },
    Progress: {
      colorSuccess: '#277c90',
    },
  },
};

export default config;