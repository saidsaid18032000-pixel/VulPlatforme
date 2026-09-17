#!/usr/bin/env python3
"""Génère le PDF de présentation VulnPlatform (plateforme + sprints)."""

from pathlib import Path

from fpdf import FPDF
from fpdf.enums import XPos, YPos

OUTPUT = Path(__file__).resolve().parent / "VulnPlatform-Presentation-Sprints.pdf"
FONTS = Path(r"C:\Windows\Fonts")


class VulnPlatformPDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("ArialUni", "I", 9)
        self.set_text_color(100, 116, 139)
        self.cell(0, 8, "VulnPlatform - Presentation & Sprints", align="L", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("ArialUni", "I", 8)
        self.set_text_color(148, 163, 184)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")

    def section_title(self, text: str):
        self.ln(4)
        self.set_font("ArialUni", "B", 14)
        self.set_text_color(15, 23, 42)
        self.multi_cell(0, 8, text, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_draw_color(14, 165, 233)
        self.set_line_width(0.6)
        y = self.get_y()
        self.line(self.l_margin, y, self.w - self.r_margin, y)
        self.ln(6)

    def body(self, text: str):
        self.set_font("ArialUni", "", 11)
        self.set_text_color(51, 65, 85)
        self.multi_cell(0, 6.5, text, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(2)

    def numbered(self, n: int, text: str):
        self.set_font("ArialUni", "", 11)
        self.set_text_color(51, 65, 85)
        self.multi_cell(0, 6.5, f"{n}. {text}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    def bullet(self, text: str, indent: float = 4):
        self.set_x(self.l_margin + indent)
        self.set_font("ArialUni", "", 11)
        self.set_text_color(51, 65, 85)
        width = self.w - self.r_margin - (self.l_margin + indent)
        self.multi_cell(width, 6.5, f"- {text}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    def sprint_block(self, title: str, status: str, description: str, result: str):
        self.set_font("ArialUni", "B", 11)
        self.set_text_color(15, 23, 42)
        self.multi_cell(0, 6.5, title, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

        self.set_font("ArialUni", "I", 9)
        self.set_text_color(14, 165, 233)
        self.multi_cell(0, 5, f"Statut : {status}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

        self.set_font("ArialUni", "", 10)
        self.set_text_color(51, 65, 85)
        self.multi_cell(0, 5.5, description, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

        self.set_font("ArialUni", "B", 10)
        self.set_text_color(15, 23, 42)
        self.multi_cell(0, 5.5, f"Resultat : {result}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

        self.ln(4)
        self.set_draw_color(203, 213, 225)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(5)


def build_pdf() -> Path:
    pdf = VulnPlatformPDF(orientation="P", unit="mm", format="A4")
    pdf.add_font("ArialUni", "", str(FONTS / "arial.ttf"))
    pdf.add_font("ArialUni", "B", str(FONTS / "arialbd.ttf"))
    pdf.add_font("ArialUni", "I", str(FONTS / "ariali.ttf"))
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(18, 18, 18)

    # ---- Page de garde ----
    pdf.add_page()
    pdf.ln(35)
    pdf.set_font("ArialUni", "B", 28)
    pdf.set_text_color(15, 23, 42)
    pdf.multi_cell(0, 12, "VulnPlatform", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(4)
    pdf.set_font("ArialUni", "", 14)
    pdf.set_text_color(71, 85, 105)
    pdf.multi_cell(
        0,
        8,
        "Plateforme intelligente de gestion des vulnérabilités",
        align="C",
        new_x=XPos.LMARGIN,
        new_y=YPos.NEXT,
    )
    pdf.ln(8)
    pdf.set_draw_color(14, 165, 233)
    pdf.set_line_width(1)
    mid = pdf.w / 2
    pdf.line(mid - 30, pdf.get_y(), mid + 30, pdf.get_y())
    pdf.ln(12)
    pdf.set_font("ArialUni", "", 12)
    pdf.set_text_color(100, 116, 139)
    pdf.multi_cell(
        0,
        7,
        "Document de présentation\nQu'est-ce que la plateforme ?\nÀ quoi sert chaque sprint ?",
        align="C",
        new_x=XPos.LMARGIN,
        new_y=YPos.NEXT,
    )
    pdf.ln(20)
    pdf.set_font("ArialUni", "I", 10)
    pdf.multi_cell(
        0,
        6,
        "Inspirée de Rapid7 · Architecture microservices · Équipe SOC / SSI",
        align="C",
        new_x=XPos.LMARGIN,
        new_y=YPos.NEXT,
    )

    # ---- Contenu ----
    pdf.add_page()

    pdf.section_title("1. C'est quoi VulnPlatform ?")
    pdf.body(
        "VulnPlatform est une plateforme de gestion des vulnérabilités destinée "
        "à une équipe SOC (Security Operations Center) / SSI (Sécurité des "
        "Systèmes d'Information). Elle centralise le suivi de la surface "
        "d'attaque et le cycle de vie des risques de sécurité."
    )
    pdf.body("Elle sert à :")
    pdf.numbered(1, "Inventorier les machines et systèmes (serveurs, postes, réseaux, bases, cloud…).")
    pdf.numbered(2, "Lancer des scans de sécurité sur ces actifs.")
    pdf.numbered(3, "Centraliser les vulnérabilités trouvées (CVE, criticité, statut).")
    pdf.numbered(4, "Alerter sur les risques critiques.")
    pdf.numbered(5, "Produire des rapports pour le management / audit.")
    pdf.numbered(6, "(plus tard) Aider à prioriser via de l'intelligence artificielle.")
    pdf.ln(2)
    pdf.body(
        "En résumé : un tableau de bord SOC qui relie actifs → scans → "
        "vulnérabilités → alertes → rapports."
    )

    pdf.section_title("2. Architecture (vue simplifiée)")
    pdf.body("Angular (interface) → API Gateway → Microservices → PostgreSQL")
    pdf.ln(1)
    pdf.body("Services principaux :")
    services = [
        ("auth-service", "Connexion, JWT, rôles (ADMIN, ANALYSTE_SOC…)"),
        ("asset-service", "Inventaire des actifs"),
        ("scan-service", "Lancement et suivi des scans"),
        ("vulnerability-service", "Catalogue des vulnérabilités"),
        ("alert-service", "Alertes critiques"),
        ("report-service", "Rapports PDF / exports"),
        ("ai-service", "Analyse et recommandations IA"),
    ]
    for name, role in services:
        pdf.bullet(f"{name} : {role}")

    pdf.section_title("3. À quoi sert chaque sprint ?")
    pdf.body(
        "Chaque sprint construit une brique métier sur la précédente. "
        "L'objectif est d'avancer étape par étape vers une plateforme SOC complète."
    )

    pdf.sprint_block(
        "Sprint 0 — Fondations",
        "Fait",
        "Mettre en place le socle technique : monorepo, Docker, PostgreSQL, "
        "microservices, CI/CD et documentation.",
        "On dispose d'une base propre pour développer.",
    )
    pdf.sprint_block(
        "Sprint 1 — Authentification & Dashboard SOC",
        "Fait (fusionné dans develop)",
        "Donner accès à la plateforme : login / JWT, rôles (RBAC), "
        "tableau de bord SOC (vue d'ensemble).",
        "On peut se connecter et utiliser une console sécurisée.",
    )
    pdf.sprint_block(
        "Sprint 2 — Inventaire des actifs & Moteur de scans",
        "Fait (branche feature/sprint-2-assets-scans)",
        "Cœur opérationnel : inventaire des actifs (CRUD, filtres, KPIs) "
        "et moteur de scans (lancement, progression live, génération de vulnérabilités).",
        "On sait quoi protéger et on peut lancer des analyses.",
    )

    pdf.add_page()
    pdf.sprint_block(
        "Sprint 3 — Vulnérabilités & Alertes",
        "Suivant (prévu)",
        "Exploiter les résultats des scans : liste / filtre / suivi des vulnérabilités, "
        "cycle de vie (ouverte → en cours → corrigée), alertes critiques (ex. CVSS élevé).",
        "Le SOC traite les risques au lieu de seulement les découvrir.",
    )
    pdf.sprint_block(
        "Sprint 4 — Rapports",
        "Prévu dans l'architecture",
        "Générer des livrables : rapports périodiques, exports pour audit / direction, "
        "synthèse par criticité / actif / période.",
        "On communique l'état de sécurité hors de l'outil.",
    )
    pdf.sprint_block(
        "Sprint 5 — Intelligence artificielle",
        "Prévu dans l'architecture",
        "Enrichir la décision : priorisation intelligente, recommandations de remediation, "
        "aide à l'analyste SOC.",
        "On passe d'une liste de CVE à une décision : que faire en premier.",
    )

    pdf.section_title("4. Chaîne logique (flux métier)")
    flow = [
        "L'utilisateur se connecte (Sprint 1)",
        "Il inventorie ses actifs (Sprint 2)",
        "Il lance un scan (Sprint 2)",
        "Il consulte / traite les vulnérabilités (Sprint 3)",
        "Il reçoit des alertes critiques (Sprint 3)",
        "Il génère un rapport (Sprint 4)",
        "Il s'appuie sur l'IA pour prioriser (Sprint 5)",
    ]
    for i, step in enumerate(flow, 1):
        pdf.numbered(i, step)

    pdf.ln(4)
    pdf.section_title("5. État d'avancement actuel")
    pdf.body(
        "Sprint 0 : Fait\n"
        "Sprint 1 : Fait (fusionné dans develop)\n"
        "Sprint 2 : Fait sur feature/sprint-2-assets-scans\n"
        "Sprint 3 et suivants : pas encore attaqués"
    )
    pdf.ln(2)
    pdf.body(
        "Prochaines options naturelles :\n"
        "1) Merger le Sprint 2 dans develop\n"
        "2) Enchaîner le Sprint 3 (vulnérabilités & alertes)"
    )

    pdf.ln(10)
    pdf.set_font("ArialUni", "I", 9)
    pdf.set_text_color(148, 163, 184)
    pdf.multi_cell(
        0,
        5,
        "Document généré automatiquement à partir de la présentation projet VulnPlatform.",
        align="C",
        new_x=XPos.LMARGIN,
        new_y=YPos.NEXT,
    )

    pdf.output(str(OUTPUT))
    return OUTPUT


if __name__ == "__main__":
    path = build_pdf()
    print(f"PDF généré : {path}")
