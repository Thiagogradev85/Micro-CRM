import crypto                       from 'crypto'
import nodemailer                  from 'nodemailer'
import db                          from '../db/db.js'
import { hashPassword, verifyPassword, signToken } from '../utils/auth.js'
import { AppError }                from '../utils/AppError.js'

// Cria um transporter SMTP de sistema para e-mails automáticos (ex: redefinição de senha).
// Lê SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE das variáveis de ambiente.
function buildSystemTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null
  return nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   parseInt(SMTP_PORT || '587'),
    secure: SMTP_SECURE === 'true',
    auth:   { user: SMTP_USER, pass: SMTP_PASS },
    tls:    { rejectUnauthorized: false },
    family: 4,
  })
}

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 dias
}

/** POST /auth/login */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body
    if (!email || !password) throw new AppError('Email e senha obrigatórios.', 400)

    const { rows } = await db.query(
      `SELECT id, nome, email, password_hash, role, ativo FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    )
    const user = rows[0]
    if (!user) throw new AppError('Email ou senha incorretos.', 401)
    if (!user.ativo) throw new AppError('Conta desativada. Entre em contato com o administrador.', 403)

    const ok = await verifyPassword(password, user.password_hash)
    if (!ok) throw new AppError('Email ou senha incorretos.', 401)

    const token = signToken({ id: user.id, email: user.email, nome: user.nome, role: user.role })

    res.cookie('token', token, COOKIE_OPTS)
    res.json({ ok: true, user: { id: user.id, nome: user.nome, email: user.email, role: user.role } })
  } catch (err) {
    next(err)
  }
}

/** POST /auth/logout */
export function logout(req, res) {
  res.clearCookie('token', COOKIE_OPTS)
  res.json({ ok: true })
}

/** GET /auth/me */
export function me(req, res) {
  res.json({ user: req.user })
}

/** GET /auth/users — admin: lista todos os usuários */
export async function listUsers(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT id, nome, email, role, ativo, created_at FROM users ORDER BY created_at`
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
}

const DEFAULT_STATUSES = [
  { nome: 'Prospecção', cor: '#6b7280', ordem: 1 },
  { nome: 'Contatado',  cor: '#3b82f6', ordem: 2 },
  { nome: 'Proposta',   cor: '#f59e0b', ordem: 3 },
  { nome: 'Fechado',    cor: '#22c55e', ordem: 4 },
  { nome: 'Perdido',    cor: '#ef4444', ordem: 5 },
]

const SEED_UFS = ['SP','RJ','MG','RS','PR','SC','BA','GO','PE','CE']
const SEED_NOMES = ['Loja Exemplo','Distribuidora Teste','Comércio Demo','Empresa Piloto','Negócio Modelo']

async function seedUserDefaults(userId, client) {
  // Cria os 5 statuses padrão e captura o id de Prospecção
  let prospeccaoId = null
  for (const s of DEFAULT_STATUSES) {
    const { rows } = await client.query(
      `INSERT INTO status (nome, cor, ordem, user_id) VALUES ($1, $2, $3, $4) RETURNING id`,
      [s.nome, s.cor, s.ordem, userId]
    )
    if (s.nome === 'Prospecção') prospeccaoId = rows[0].id
  }

  // Cria 1 cliente de teste para confirmar isolamento no banco
  const uf   = SEED_UFS[userId % SEED_UFS.length]
  const nome = `${SEED_NOMES[userId % SEED_NOMES.length]} (${uf})`
  await client.query(
    `INSERT INTO clients (nome, uf, status_id, user_id) VALUES ($1, $2, $3, $4)`,
    [nome, uf, prospeccaoId, userId]
  )
}

/** POST /auth/users — admin: cria novo usuário */
export async function createUser(req, res, next) {
  const client = await db.connect()
  try {
    const { nome, email, password, role = 'user' } = req.body
    if (!nome || !email || !password) throw new AppError('Nome, email e senha são obrigatórios.', 400)
    if (!['admin', 'user'].includes(role)) throw new AppError('Role inválido.', 400)

    await client.query('BEGIN')

    const hash = await hashPassword(password)
    const { rows } = await client.query(
      `INSERT INTO users (nome, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nome, email, role, ativo, created_at`,
      [nome.trim(), email.toLowerCase().trim(), hash, role]
    )
    const newUser = rows[0]

    await seedUserDefaults(newUser.id, client)

    await client.query('COMMIT')
    res.status(201).json(newUser)
  } catch (err) {
    await client.query('ROLLBACK')
    if (err.code === '23505') return next(new AppError('Este email já está cadastrado.', 409))
    next(err)
  } finally {
    client.release()
  }
}

/** PUT /auth/users/:id — admin: atualiza usuário */
export async function updateUser(req, res, next) {
  try {
    const { id } = req.params
    const { nome, email, password, role, ativo } = req.body

    const sets = []
    const vals = []
    let i = 1

    if (nome     !== undefined) { sets.push(`nome = $${i++}`);          vals.push(nome.trim()) }
    if (email    !== undefined) { sets.push(`email = $${i++}`);         vals.push(email.toLowerCase().trim()) }
    if (role     !== undefined) { sets.push(`role = $${i++}`);          vals.push(role) }
    if (ativo    !== undefined) { sets.push(`ativo = $${i++}`);         vals.push(ativo) }
    if (password)               { sets.push(`password_hash = $${i++}`); vals.push(await hashPassword(password)) }

    if (sets.length === 0) throw new AppError('Nenhum campo para atualizar.', 400)

    vals.push(id)
    const { rows } = await db.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${i} RETURNING id, nome, email, role, ativo`,
      vals
    )
    if (!rows[0]) throw new AppError('Usuário não encontrado.', 404)
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
}

/** DELETE /auth/users/:id — admin: remove usuário */
export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params
    if (parseInt(id) === req.user.id) throw new AppError('Você não pode excluir sua própria conta.', 400)
    await db.query(`DELETE FROM users WHERE id = $1`, [id])
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}

/** POST /auth/forgot-password
 *  body: { email }
 *  Gera token de redefinição e envia e-mail com link.
 *  Sempre responde com sucesso para não vazar quais e-mails existem.
 */
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body
    if (!email) throw new AppError('E-mail obrigatório.', 400)

    const { rows } = await db.query(
      `SELECT id, nome, email FROM users WHERE email = $1 AND ativo = true`,
      [email.toLowerCase().trim()]
    )

    // Responde igual independente de o e-mail existir (evita user enumeration)
    if (rows.length === 0) {
      return res.json({ ok: true, message: 'Se o e-mail estiver cadastrado, você receberá as instruções em breve.' })
    }

    const user  = rows[0]
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    // Remove tokens anteriores do mesmo usuário e insere o novo
    await db.query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [user.id])
    await db.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    )

    // Monta link de redefinição
    const appUrl  = process.env.APP_URL || 'http://localhost:5173'
    const resetUrl = `${appUrl}/reset-password?token=${token}`

    const transporter = buildSystemTransporter()
    if (!transporter) {
      console.warn('[ForgotPassword] SMTP do sistema não configurado — link gerado mas e-mail não enviado.')
      console.warn(`[ForgotPassword] Link para ${user.email}: ${resetUrl}`)
      return res.json({ ok: true, message: 'Se o e-mail estiver cadastrado, você receberá as instruções em breve.' })
    }

    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;">
        <h2 style="color:#3b82f6;">Redefinição de senha — Leads CRM</h2>
        <p>Olá, <strong>${user.nome}</strong>!</p>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
        <p style="margin:24px 0;">
          <a href="${resetUrl}"
             style="background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
            Redefinir minha senha
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px;">
          O link expira em <strong>1 hora</strong>.<br>
          Se você não solicitou a redefinição, ignore este e-mail.
        </p>
      </div>
    `

    await transporter.sendMail({
      from:    `"Leads CRM" <${process.env.SMTP_USER}>`,
      to:      user.email,
      subject: 'Redefinição de senha — Leads CRM',
      html,
      text: `Acesse o link para redefinir sua senha: ${resetUrl}\n\nO link expira em 1 hora.`,
    })

    res.json({ ok: true, message: 'Se o e-mail estiver cadastrado, você receberá as instruções em breve.' })
  } catch (err) {
    next(err)
  }
}

/** POST /auth/reset-password
 *  body: { token, password }
 *  Valida o token e atualiza a senha.
 */
export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body
    if (!token || !password) throw new AppError('Token e nova senha são obrigatórios.', 400)
    if (password.length < 6) throw new AppError('A senha deve ter pelo menos 6 caracteres.', 400)

    const { rows } = await db.query(
      `SELECT prt.id, prt.user_id, prt.expires_at, u.nome, u.email
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token = $1`,
      [token]
    )

    if (rows.length === 0) throw new AppError('Token inválido ou já utilizado.', 400)

    const record = rows[0]
    if (new Date(record.expires_at) < new Date()) {
      await db.query(`DELETE FROM password_reset_tokens WHERE id = $1`, [record.id])
      throw new AppError('Token expirado. Solicite um novo link.', 400)
    }

    const hash = await hashPassword(password)
    await db.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, record.user_id])
    await db.query(`DELETE FROM password_reset_tokens WHERE id = $1`, [record.id])

    res.json({ ok: true, message: 'Senha atualizada com sucesso. Faça login normalmente.' })
  } catch (err) {
    next(err)
  }
}
