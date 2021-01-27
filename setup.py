VERSION=""

if event.type == CS_EVENT_PKG_INSTALL:
    logger.warning(f'Installing HMI Block UI v{VERSION}')
    extract_package()
