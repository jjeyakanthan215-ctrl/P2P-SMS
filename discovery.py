import socket
import logging
from zeroconf import ServiceInfo, Zeroconf
import time
import uuid

logger = logging.getLogger(__name__)

class MDNSService:
    def __init__(self, port, name="P2PSMS"):
        self.zeroconf = Zeroconf()
        self.port = port
        self.name = name
        self.service_info = None
        self.ip = self._get_local_ip()

    def _get_local_ip(self):
        """Get the local IP address of this machine."""
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            # doesn't even have to be reachable
            s.connect(('10.255.255.255', 1))
            IP = s.getsockname()[0]
        except Exception:
            IP = '127.0.0.1'
        finally:
            s.close()
        return IP

    def start(self):
        """Register the mDNS service on the local network."""
        desc = {'path': '/'}
        
        # Unique instance name to avoid collisions
        instance_name = f"{self.name}_{str(uuid.uuid4())[:8]}._http._tcp.local."
        
        self.service_info = ServiceInfo(
            "_http._tcp.local.",
            instance_name,
            addresses=[socket.inet_aton(self.ip)],
            port=self.port,
            properties=desc,
            server=f"{self.name}.local."
        )

        try:
            self.zeroconf.register_service(self.service_info)
            logger.info(f"Registered mDNS service {instance_name} at {self.ip}:{self.port}")
        except Exception as e:
            logger.error(f"Failed to register mDNS service: {e}")

    def stop(self):
        """Unregister the mDNS service."""
        if self.service_info:
            try:
                self.zeroconf.unregister_service(self.service_info)
            except Exception:
                pass
        self.zeroconf.close()
        logger.info("mDNS service stopped.")
