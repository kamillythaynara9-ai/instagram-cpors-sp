# Frame de vídeo em alta qualidade, sem mudar o conteúdo:
# escolhe o quadro mais nítido perto de t, tira ruído usando os quadros vizinhos,
# super-resolução EDSR x2, corrige exposição só se estiver escura, nitidez leve.
import cv2, numpy as np, sys, time
video, t, y0, out, model = sys.argv[1], float(sys.argv[2]), int(sys.argv[3]), sys.argv[4], sys.argv[5]
cap = cv2.VideoCapture(video); fps = cap.get(cv2.CAP_PROP_FPS) or 30
f0 = int(round(t * fps)) - 5; cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, f0))
fr = []
for _ in range(11):
    ok, im = cap.read()
    if not ok: break
    fr.append(im[y0:y0 + 900, 0:720].copy())
nit = [cv2.Laplacian(cv2.cvtColor(x, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var() for x in fr]
k = int(np.argmax(nit[3:8])) + 3  # só até 2 quadros do momento escolhido
win = fr[k - 2:k + 3]
den = cv2.fastNlMeansDenoisingColoredMulti(win, 2, 5, None, 4, 4, 7, 21)
sr = cv2.dnn_superres.DnnSuperResImpl_create(); sr.readModel(model); sr.setModel('edsr', 2)
up = sr.upsample(den)
lab = cv2.cvtColor(up, cv2.COLOR_BGR2LAB); L = lab[:, :, 0].astype(np.float32) / 255
m = float(L.mean())
if m < 0.40:
    g = max(0.72, np.log(0.42) / np.log(max(m, 1e-3)))
    L = np.power(L, g)
L8 = (np.clip(L, 0, 1) * 255).astype(np.uint8)
L8 = cv2.createCLAHE(clipLimit=1.2, tileGridSize=(8, 8)).apply(L8)
lab[:, :, 0] = L8; up = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
bl = cv2.GaussianBlur(up, (0, 0), 1.6); up = cv2.addWeighted(up, 1.35, bl, -0.35, 0)
cv2.imwrite(out, up, [cv2.IMWRITE_JPEG_QUALITY, 92])
print(out, 'quadro', k, 'nitidez', round(nit[k]), 'vs', round(nit[len(nit)//2]), 'luz', round(m, 2), up.shape[1::-1])
