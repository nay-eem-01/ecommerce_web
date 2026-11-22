"""Local SMTP sink for Playwright. Usage: python3 e2e/smtp_sink.py /tmp/shopper-mail.jsonl."""
from pathlib import Path
from socketserver import StreamRequestHandler, ThreadingTCPServer
from email import policy
from email.parser import BytesParser
import json
import sys

mailbox_path = Path(sys.argv[1])
mailbox_path.touch(exist_ok=True)

class Sink(StreamRequestHandler):
    def reply(self, text):
        self.wfile.write((text + "\r\n").encode())

    def handle(self):
        self.reply("220 localhost SMTP test sink")
        while raw := self.rfile.readline():
            command = raw.strip().split(b" ", 1)[0].upper()
            if command == b"DATA":
                self.reply("354 End with a dot")
                lines = []
                while (line := self.rfile.readline()) and line.rstrip(b"\r\n") != b".":
                    lines.append(line[1:] if line.startswith(b"..") else line)
                message = BytesParser(policy=policy.default).parsebytes(b"".join(lines))
                with mailbox_path.open("a") as mailbox:
                    mailbox.write(json.dumps({"to": str(message["To"]), "text": message.get_content()}) + "\n")
                self.reply("250 accepted")
            elif command == b"QUIT":
                self.reply("221 Bye")
                break
            else:
                self.reply("250 OK")

class SmtpServer(ThreadingTCPServer):
    allow_reuse_address = True


SmtpServer(("127.0.0.1", 25252), Sink).serve_forever()
