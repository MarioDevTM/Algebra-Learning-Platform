const express = require('express');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcrypt');
const cors = require('cors');
const _ = require('lodash');

const app = express();
const PORT = 3000;
const saltRounds = 10;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let db;

async function initializeDatabase() {
    db = await open({ filename: './database.db', driver: sqlite3.Database });
    console.log('Connected to the SQLite database.');
    await db.exec(`
    CREATE TABLE IF NOT EXISTS users ( email TEXT PRIMARY KEY, username TEXT NOT NULL, password TEXT NOT NULL, points INTEGER DEFAULT 0, dailyStreak INTEGER DEFAULT 0, lastLoginDate TEXT, completedLessons TEXT DEFAULT '[]', unlockedAchievements TEXT DEFAULT '[]' );
    CREATE TABLE IF NOT EXISTS problems ( id TEXT PRIMARY KEY, userEmail TEXT NOT NULL, title TEXT NOT NULL, equation TEXT NOT NULL, difficulty TEXT NOT NULL, solved INTEGER DEFAULT 0, FOREIGN KEY (userEmail) REFERENCES users(email) );
    CREATE TABLE IF NOT EXISTS quiz_attempts ( attempt_id INTEGER PRIMARY KEY AUTOINCREMENT, userEmail TEXT NOT NULL, lessonId TEXT NOT NULL, is_correct INTEGER NOT NULL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (userEmail) REFERENCES users(email) );
  `);
}

// --- MASSIVELY EXPANDED 40-LESSON CURRICULUM ---
// Content adapted from "Abstract Algebra: Theory and Applications" by Thomas W. Judson,
// available under the GNU Free Documentation License.
const lessons = [
    // Module 1: Foundations (4 Lessons)
    { id: 'FND_L1', title: 'Sets and Relations', points: 10, content: '<p>A <strong>set</strong> is a well-defined collection of objects. The objects that make up a set are called its <strong>elements</strong> or <strong>members</strong>. We often use capital letters to denote sets and lowercase letters for elements.</p><p>A <strong>relation</strong> on a set S is a subset of S × S. A particularly important type is the <strong>equivalence relation</strong>, which is a relation that is <strong>reflexive</strong> (a ~ a), <strong>symmetric</strong> (if a ~ b, then b ~ a), and <strong>transitive</strong> (if a ~ b and b ~ c, then a ~ c). An equivalence relation partitions a set S into a collection of disjoint subsets called equivalence classes.</p>', hint: 'The relation "a is congruent to b mod n" on the integers is a classic equivalence relation.', quiz: { question: "Which property makes a relation an equivalence relation?", options: ['Reflexivity, Symmetry, Transitivity', 'Reflexivity, Antisymmetry, Transitivity', 'Asymmetry and Transitivity'], correctAnswer: 0 } },
    { id: 'FND_L2', title: 'Laws of Composition', points: 10, content: `<p>A <strong>binary operation</strong> or <strong>law of composition</strong> on a set G is a function G × G → G that assigns to each pair (a, b) ∈ G × G a unique element a ⋅ b in G. For an operation to be useful, it often has key properties:</p><ul><li><strong>Associativity:</strong> (a ⋅ b) ⋅ c = a ⋅ (b ⋅ c) for all a, b, c ∈ G.</li><li><strong>Commutativity:</strong> a ⋅ b = b ⋅ a for all a, b ∈ G.</li><li><strong>Identity Element:</strong> There exists an element e ∈ G such that a ⋅ e = e ⋅ a = a for all a ∈ G.</li><li><strong>Inverse Element:</strong> For each a ∈ G, there exists an element a⁻¹ ∈ G such that a ⋅ a⁻¹ = a⁻¹ ⋅ a = e.</li></ul><p>These properties form the basis for defining algebraic structures.</p>`, hint: 'Matrix multiplication is a classic example of a non-commutative operation.', quiz: { question: "Matrix multiplication is an example of what kind of operation?", options: ['Commutative', 'Associative but not Commutative', 'Neither Associative nor Commutative'], correctAnswer: 1 } },
    { id: 'FND_L3', title: 'Properties of Integers', points: 15, content: `<p>The set of integers <strong>ℤ</strong> = {..., -2, -1, 0, 1, 2, ...} is a fundamental algebraic structure. A key property is the <strong>Well-Ordering Principle</strong>: every non-empty set of positive integers contains a least element.</p><p>This leads to the <strong>Division Algorithm</strong>: For any integers a and b with b > 0, there exist unique integers q (the quotient) and r (the remainder) such that <strong>a = bq + r</strong>, where 0 ≤ r < b. This algorithm is the foundation for concepts like greatest common divisors (GCD) and modular arithmetic.</p>`, hint: 'The Euclidean Algorithm works by repeatedly applying the Division Algorithm.', quiz: { question: 'What does the Division Algorithm state for integers a and b (b≠0)?', options: ['a = bq', 'a = bq + r, where 0 ≤ r < |b|', 'a + b = q + r'], correctAnswer: 1 } },
    { id: 'FND_L4', title: 'Modular Arithmetic', points: 15, content: `<p><strong>Modular arithmetic</strong> is a system of arithmetic for integers, where numbers "wrap around" upon reaching a certain value—the <strong>modulus</strong>. We say that two integers a and b are <strong>congruent modulo n</strong> if n divides (a - b). We write this as <strong>a ≡ b (mod n)</strong>.</p><p>The set of congruence classes modulo n is denoted <strong>ℤₙ</strong>. For example, in ℤ₅, the elements are the classes [0], [1], [2], [3], and [4]. We can perform addition and multiplication on these classes, making ℤₙ a ring.</p>`, hint: 'Think of it as "clock arithmetic". On a 12-hour clock, 15 o\'clock is 3 o\'clock.', quiz: { question: 'What is 15 mod 4?', options: ['1', '2', '3'], correctAnswer: 2 } },
    // Module 2: Group Theory
    { id: 'GRP_L1', title: 'Definition of a Group', points: 20, content: `<p>A <strong>group</strong> is a set G, together with a binary operation ⋅ on G, such that the following axioms are satisfied:</p><ul><li>The operation ⋅ is <strong>associative</strong>.</li><li>There is an element <strong>e ∈ G</strong> (the identity element) such that for any a ∈ G, a ⋅ e = e ⋅ a = a.</li><li>For each element a ∈ G, there exists an <strong>inverse element a⁻¹ ∈ G</strong> such that a ⋅ a⁻¹ = a⁻¹ ⋅ a = e.</li></ul><p>If the operation is also commutative, the group is called <strong>Abelian</strong>. The number of elements in a group is its <strong>order</strong>.</p>`, hint: '(ℕ, +) is not a group because it lacks inverse elements.', quiz: { question: 'Which set forms a group under multiplication?', options: ['The integers (ℤ)', 'The non-zero rational numbers (ℚ*)', 'The natural numbers (ℕ)'], correctAnswer: 1 } },
    { id: 'GRP_L2', title: 'Elementary Properties of Groups', points: 20, content: '<p>From the group axioms, several fundamental properties can be derived. The <strong>identity element</strong> in a group is unique. Similarly, for any element a in a group G, its <strong>inverse, a⁻¹, is unique</strong>.</p><p>Another key property is the <strong>cancellation law</strong>. If a, b, and c are elements of a group G, then either ba = ca or ab = ac implies that b = c. A famous property for inverses is the "socks-shoes" property, which states that for any two elements a and b, the inverse of their product is given by <strong>(ab)⁻¹ = b⁻¹a⁻¹</strong>.</p>', hint: 'To undo putting on socks then shoes, you must first take off the shoes.', quiz: { question: 'In a group G, what is the inverse of the product (ab)?', options: ['a⁻¹b⁻¹', 'b⁻¹a⁻¹', '(ab)'], correctAnswer: 1 } },
    { id: 'GRP_L3', title: 'Subgroups and Subgroup Tests', points: 20, content: `<p>A subset H of a group G is a <strong>subgroup</strong> of G if H is also a group under the operation of G. To check if a non-empty subset H is a subgroup, we can use a <strong>subgroup test</strong>.</p><p>The one-step test states that H is a subgroup if and only if for every a, b ∈ H, the element <strong>ab⁻¹</strong> is also in H. This single condition neatly combines the checks for closure under the group operation and the existence of inverses within the subset H.</p>`, hint: 'The set of even integers is a subgroup of the integers under addition.', quiz: { question: 'Which is a subgroup of the group of non-zero complex numbers under multiplication (ℂ*, *)?', options: ['The unit circle {z ∈ ℂ | |z|=1}', 'The imaginary numbers', 'The integers'], correctAnswer: 0 } },
    { id: 'GRP_L4', title: 'Cyclic Groups', points: 25, content: `<p>A group G is <strong>cyclic</strong> if there exists an element g ∈ G such that every element in G can be written as a power of g. This element g is called a <strong>generator</strong> of G, and we write G = <g>.</p><p>The order of an element g is the smallest positive integer n such that gⁿ = e (the identity). The order of an element is equal to the order of the cyclic subgroup it generates. All cyclic groups are Abelian, but not all Abelian groups are cyclic.</p>`, hint: 'The group (ℤ, +) is cyclic, generated by 1 (or -1).', quiz: { question: 'Which element generates the cyclic group (ℤ₆, +)?', options: ['2', '3', '5'], correctAnswer: 2 } },
    { id: 'GRP_L5', title: 'The Symmetric Group Sₙ', points: 25, content: `<p>The set of all bijective functions (permutations) from a set {1, ..., n} to itself forms the <strong>symmetric group Sₙ</strong> under the operation of function composition. The order of this group is <strong>n!</strong> (n factorial).</p><p>We can represent permutations using <strong>cycle notation</strong>. For example, the cycle (1 3 2) represents the permutation that sends 1 to 3, 3 to 2, and 2 to 1. Every permutation can be uniquely written as a product of disjoint cycles.</p>`, hint: 'Remember that composition of permutations is read from right to left.', quiz: { question: 'What is the order of the symmetric group S₅?', options: ['5', '25', '120'], correctAnswer: 2 } },
    { id: 'GRP_L6', title: 'The Alternating Group Aₙ', points: 25, content: `<p>A <strong>transposition</strong> is a cycle of length 2, like (1 2). Every permutation in Sₙ can be written as a product of transpositions. A permutation is called <strong>even</strong> if it can be written as a product of an even number of transpositions, and <strong>odd</strong> otherwise.</p><p>The set of all even permutations in Sₙ forms a subgroup called the <strong>alternating group Aₙ</strong>. Aₙ is a normal subgroup of Sₙ and its order is n!/2.</p>`, hint: 'A 3-cycle like (1 2 3) is an even permutation because (1 2 3) = (1 3)(1 2).', quiz: { question: 'The alternating group Aₙ consists of all...', options: ['Even permutations in Sₙ', 'Odd permutations in Sₙ', 'Cyclic permutations in Sₙ'], correctAnswer: 0 } },
    { id: 'GRP_L7', title: "Lagrange's Theorem", points: 30, content: `<p><strong>Lagrange's Theorem</strong> is a cornerstone of finite group theory. It states that if H is a subgroup of a finite group G, then the order of H must be a divisor of the order of G.</p><p>This theorem has powerful consequences. For example, if a group G has an order that is a prime number p, then G must be cyclic and any non-identity element is a generator. This is because the only possible orders for a subgroup are 1 and p.</p>`, hint: 'A consequence is that any group of prime order must be cyclic.', quiz: { question: 'A group G has order 21. What is a possible order for a subgroup of G?', options: ['5', '7', '9'], correctAnswer: 1 } },
    { id: 'GRP_L8', title: 'Group Homomorphisms', points: 30, content: `<p>A <strong>homomorphism</strong> is a map φ: G → H between two groups that preserves the group operation. That is, for all a, b ∈ G, it must satisfy <strong>φ(ab) = φ(a)φ(b)</strong>. This means the structure of G is "carried over" in some way to the structure of H.</p><p>The <strong>kernel</strong> of a homomorphism, denoted Ker(φ), is the set of elements in G that are mapped to the identity element in H. The kernel is always a normal subgroup of G.</p>`, hint: 'Isomorphic groups are structurally identical, connected by a bijective homomorphism.', quiz: { question: 'The kernel of a group homomorphism φ: G → H is always...', options: ['A subgroup of H', 'A normal subgroup of G', 'An abelian group'], correctAnswer: 1 } },
    { id: 'GRP_L9', title: 'Quotient (Factor) Groups', points: 35, content: `<p>If N is a <strong>normal subgroup</strong> of G (meaning gN = Ng for all g ∈ G), then the set of all cosets of N in G, denoted <strong>G/N</strong>, can be turned into a group itself. This is called the <strong>quotient group</strong> or factor group.</p><p>The elements of G/N are the cosets, and the operation is defined as (aN)(bN) = (ab)N. This construction is one of the most important in group theory, as it allows us to build simpler groups from more complex ones.</p>`, hint: 'The elements of a quotient group are sets (the cosets).', quiz: { question: 'The elements of a quotient group G/N are...', options: ['Elements of G', 'Elements of N', 'Cosets of N in G'], correctAnswer: 2 } },
    { id: 'GRP_L10', title: 'The Isomorphism Theorems', points: 35, content: `<p>The <strong>Isomorphism Theorems</strong> are a collection of results that describe the relationship between quotient groups and homomorphisms.</p><p>The most important is the <strong>First Isomorphism Theorem</strong>. It states that if φ: G → H is a group homomorphism, then the quotient group G/Ker(φ) is isomorphic to the image of the homomorphism, Im(φ). This provides a fundamental link between homomorphisms and the structure of quotient groups.</p>`, hint: 'This theorem is fundamental for understanding the structure of groups.', quiz: { question: 'The First Isomorphism Theorem states that G/Ker(φ) is isomorphic to...', options: ['G', 'H', 'Im(φ)'], correctAnswer: 2 } },
    { id: 'GRP_L11', title: 'Group Actions', points: 35, content: `<p>A <strong>group action</strong> of a group G on a set X is a map G × X → X, written as (g, x) ↦ g⋅x, that is compatible with the group law: e⋅x = x and (gh)⋅x = g⋅(h⋅x). This formalizes the idea of a group's symmetries acting on an object.</p><p>Two key concepts arise from group actions: the <strong>orbit</strong> of an element x ∈ X is the set of all elements that x can be moved to by G. The <strong>stabilizer</strong> of x is the subgroup of G consisting of all elements that fix x.</p>`, hint: 'The set of rotations of a square is a group action on the vertices of the square.', quiz: { question: "What is the key property of a group action of G on a set X?", options: ['g·(h·x) = (gh)·x', 'g·x = x', 'g·x = h·x implies g=h'], correctAnswer: 0 } },
    { id: 'GRP_L12', title: "Sylow's Theorems", points: 40, content: `<p><strong>Sylow's Theorems</strong> are a set of powerful results that provide detailed information about the structure of finite groups. They serve as a partial converse to Lagrange's Theorem.</p><p>If G is a finite group and p is a prime dividing the order of G, then a <strong>Sylow p-subgroup</strong> is a subgroup of G of order pᵏ, where pᵏ is the highest power of p dividing |G|. The theorems guarantee the existence of such subgroups and provide information on their number and conjugacy.</p>`, hint: 'These theorems are a partial converse to Lagrange\'s Theorem.', quiz: { question: "If |G| = 12 = 2² * 3, Sylow's Theorems guarantee the existence of a subgroup of what order?", options: ['6', '4', '8'], correctAnswer: 1 } },
    // Module 3: Ring Theory
    { id: 'RNG_L1', title: 'Definition of a Ring', points: 20, content: `<p>A <strong>ring</strong> (R, +, ⋅) is a set equipped with two binary operations, addition and multiplication, satisfying certain axioms. Specifically, (R, +) must be an <strong>Abelian group</strong>, multiplication must be <strong>associative</strong>, and the <strong>distributive laws</strong> must hold (a(b+c) = ab+ac and (a+b)c = ac+bc).</p><p>Unlike in a group, multiplication does not need to have inverses for every element, and it does not need to be commutative. If multiplication is commutative, it is a <strong>commutative ring</strong>.</p>`, hint: 'The set of n x n matrices forms a non-commutative ring.', quiz: { question: 'Which axiom is NOT required for a set to be a ring?', options: ['Associativity of multiplication', 'Commutativity of multiplication', 'Distributivity of multiplication over addition'], correctAnswer: 1 } },
    { id: 'RNG_L2', title: 'Integral Domains and Fields', points: 25, content: `<p>Within rings, we have several important subclassifications. A <strong>commutative ring</strong> R with identity 1 ≠ 0 is called an <strong>integral domain</strong> if it has no zero-divisors. This means that if a, b ∈ R and ab = 0, then either a = 0 or b = 0.</p><p>A <strong>field</strong> is a commutative ring in which every non-zero element has a multiplicative inverse. Every field is an integral domain. A very important result is that every finite integral domain is also a field.</p>`, hint: 'Every finite integral domain is a field.', quiz: { question: 'Every finite integral domain is a...', options: ['Ring', 'Field', 'Group'], correctAnswer: 1 } },
    { id: 'RNG_L3', title: 'Ring Homomorphisms and Ideals', points: 30, content: `<p>A <strong>ring homomorphism</strong> is a map φ: R → S between two rings that preserves both ring operations: φ(a + b) = φ(a) + φ(b) and φ(ab) = φ(a)φ(b).</p><p>An <strong>ideal</strong> I is a special subring of a ring R such that for every r ∈ R and every a ∈ I, both ra and ar are in I. Ideals are to rings what normal subgroups are to groups. The kernel of any ring homomorphism is always an ideal.</p>`, hint: 'Ideals in rings are analogous to normal subgroups in groups.', quiz: { question: 'The kernel of a ring homomorphism is always...', options: ['A subring', 'An ideal', 'A field'], correctAnswer: 1 } },
    { id: 'RNG_L4', title: 'Quotient Rings', points: 30, content: `<p>Just as we can form quotient groups from normal subgroups, we can form <strong>quotient rings</strong> from ideals. If I is an ideal in a ring R, the set of cosets <strong>R/I = {r + I | r ∈ R}</strong> forms a ring under the operations (r + I) + (s + I) = (r + s) + I and (r + I)(s + I) = rs + I.</p><p>This construction is fundamental in algebra. For example, the complex numbers ℂ can be constructed as the quotient ring ℝ[x] / <x² + 1>.</p>`, hint: 'This construction is used to build number systems like the complex numbers.', quiz: { question: 'The quotient ring ℝ[x] / <x²+1> is isomorphic to...', options: ['The real numbers ℝ', 'The complex numbers ℂ', 'The integers ℤ'], correctAnswer: 1 } },
    { id: 'RNG_L5', title: 'Polynomial Rings', points: 25, content: `<p>If R is a commutative ring, the set of all polynomials with coefficients in R is called the <strong>polynomial ring</strong> and is denoted <strong>R[x]</strong>. We can add and multiply polynomials in the usual way.</p><p>Many properties of R are inherited by R[x]. For example, if R is an integral domain, then R[x] is also an integral domain. However, R[x] is never a field, even if R is a field, because the variable x does not have a multiplicative inverse.</p>`, hint: 'If F is a field, F[x] is not a field because not all polynomials have multiplicative inverses.', quiz: { question: 'If F is a field, is the polynomial ring F[x] also a field?', options: ['Yes, always', 'Only if F is finite', 'No, never'], correctAnswer: 2 } },
    { id: 'RNG_L6', title: 'Factorization in Polynomial Rings', points: 30, content: `<p>Just as we factor integers into primes, we can factor polynomials into <strong>irreducible polynomials</strong> (polynomials that cannot be factored into polynomials of lower degree).</p><p>Determining if a polynomial is irreducible can be difficult. Important tools for polynomials with integer coefficients include the Rational Root Theorem and <strong>Eisenstein's Criterion</strong>. For a polynomial aₙxⁿ + ... + a₀ ∈ ℤ[x], Eisenstein's Criterion provides a sufficient condition for irreducibility over ℚ.</p>`, hint: 'An irreducible polynomial cannot be factored into polynomials of lower degree.', quiz: { question: "Eisenstein's Criterion is used to determine if a polynomial is...", options: ['Reducible', 'Irreducible', 'Cyclic'], correctAnswer: 1 } },
    { id: 'RNG_L7', title: 'Principal Ideal Domains (PIDs)', points: 35, content: `<p>A <strong>Principal Ideal Domain (PID)</strong> is an integral domain in which every ideal is a principal ideal (i.e., can be generated by a single element).</p><p>PIDs are important because they are "close" to being fields and have very nice properties. Two of the most important examples of PIDs are the ring of integers, ℤ, and the polynomial ring F[x], where F is a field.</p>`, hint: 'The ring ℤ[x] is famously not a PID.', quiz: { question: 'Which of the following is a Principal Ideal Domain?', options: ['The integers ℤ', 'The ring ℤ[x]', 'The ring of 2x2 matrices'], correctAnswer: 0 } },
    { id: 'RNG_L8', title: 'Unique Factorization Domains (UFDs)', points: 35, content: `<p>A <strong>Unique Factorization Domain (UFD)</strong> is an integral domain in which every non-zero, non-unit element can be written as a product of prime (or irreducible) elements, and this factorization is unique up to the order of the factors and multiplication by units.</p><p>This property generalizes the fundamental theorem of arithmetic from the integers to other rings. A key result is that every PID is also a UFD.</p>`, hint: 'Every PID is a UFD.', quiz: { question: 'Which property holds in a UFD?', options: ['Every element has a unique factorization into primes', 'Every ideal is principal', 'Every element is invertible'], correctAnswer: 0 } },
    { id: 'RNG_L9', title: 'Euclidean Domains', points: 35, content: `<p>A <strong>Euclidean Domain</strong> is an integral domain R for which there exists a function N (a norm) from the non-zero elements of R to the non-negative integers such that a division algorithm holds. This means for any a, b ∈ R with b ≠ 0, there exist q, r ∈ R such that a = bq + r, and either r = 0 or N(r) < N(b).</p><p>This is the most structured class of rings we often study. Every Euclidean Domain is a PID, which in turn means every Euclidean Domain is a UFD.</p>`, hint: 'The integers (with the absolute value norm) are a prime example.', quiz: { question: 'A Euclidean Domain is defined by the existence of a...', options: ['Norm function for division', 'Multiplicative identity', 'Zero-divisor'], correctAnswer: 0 } },
    { id: 'RNG_L10', title: 'Introduction to Fields', points: 25, content: `<p>A <strong>field</strong> is a commutative ring with identity in which every non-zero element has a multiplicative inverse. Fields are the fundamental objects of study in much of algebra because they are structures where we can perform addition, subtraction, multiplication, and division.</p><p>The <strong>characteristic</strong> of a field F is the smallest positive integer n such that n⋅1 = 1 + ... + 1 (n times) = 0. If no such n exists, the characteristic is 0. A key theorem states that the characteristic of any field is either 0 or a prime number.</p>`, hint: 'The characteristic of ℚ, ℝ, and ℂ is 0.', quiz: { question: 'The "characteristic" of a field is either 0 or a...', options: ['Prime number', 'Composite number', 'Rational number'], correctAnswer: 0 } },
    // Module 4: Linear Algebra
    { id: 'LNA_L1', title: 'Vector Spaces and Subspaces', points: 20, content: `<p>A <strong>vector space</strong> V over a field F is a set of objects called vectors, equipped with two operations: vector addition and scalar multiplication. These operations must satisfy ten axioms, including closure, associativity, and distributivity.</p><p>A subset W of a vector space V is a <strong>subspace</strong> of V if W is itself a vector space under the same operations. To verify if W is a subspace, one must check three conditions: the zero vector of V is in W, W is closed under vector addition, and W is closed under scalar multiplication.</p>`, hint: 'A subspace must contain the zero vector.', quiz: { question: 'Which of these is a subspace of the vector space of all real-valued functions?', options: ['Functions where f(0)=1', 'Functions where f(1)=0', 'Functions that are strictly positive'], correctAnswer: 1 } },
    { id: 'LNA_L2', title: 'Linear Independence, Basis, and Dimension', points: 25, content: `<p>A set of vectors S = {v₁, ..., vₙ} in a vector space V is <strong>linearly independent</strong> if the only solution to the equation c₁v₁ + ... + cₙvₙ = 0 is the trivial solution c₁=...=cₙ=0.</p><p>A <strong>basis</strong> for V is a linearly independent set of vectors that also spans V. This means every vector in V can be written as a unique linear combination of the basis vectors. All bases for a given vector space have the same number of vectors; this number is the <strong>dimension</strong> of the space.</p>`, hint: 'Any two bases for the same vector space have the same number of vectors.', quiz: { question: 'What is the dimension of the vector space of polynomials with real coefficients of degree at most 3?', options: ['3', '4', 'Infinite'], correctAnswer: 1 } },
    { id: 'LNA_L3', title: 'Linear Transformations', points: 25, content: `<p>A <strong>linear transformation</strong> is a function T from a vector space V to a vector space W that preserves the vector space operations. Specifically, for all vectors u, v in V and any scalar c:</p><ul><li>T(u + v) = T(u) + T(v) (preservation of addition)</li><li>T(cu) = cT(u) (preservation of scalar multiplication)</li></ul><p>Linear transformations are the "structure-preserving maps" or homomorphisms between vector spaces.</p>`, hint: 'The derivative is a linear transformation.', quiz: { question: 'Is differentiation a linear transformation on the space of polynomials?', options: ['Yes', 'No'], correctAnswer: 0 } },
    { id: 'LNA_L4', title: 'The Rank-Nullity Theorem', points: 30, content: `<p>For a linear transformation T: V → W, the <strong>kernel</strong> (or null space) is the set of vectors in V that map to the zero vector in W. The <strong>image</strong> (or range) is the set of all vectors in W that are outputs of T.</p><p>The <strong>Rank-Nullity Theorem</strong> provides a fundamental relationship between the dimensions of these spaces. It states: <strong>dim(V) = dim(Ker(T)) + dim(Im(T))</strong>. The dimension of the kernel is called the nullity, and the dimension of the image is called the rank.</p>`, hint: 'If a map from a higher dimension to a lower dimension is surjective, its kernel cannot be trivial.', quiz: { question: 'If T: V → W is a linear map and dim(V)=5, dim(W)=3, what is the minimum possible dimension of Ker(T)?', options: ['0', '2', '3'], correctAnswer: 1 } },
    { id: 'LNA_L5', title: 'Matrix Representation of a Linear Transformation', points: 30, content: `<p>Every linear transformation T: V → W between finite-dimensional vector spaces can be represented by a <strong>matrix</strong> with respect to chosen bases for V and W.</p><p>If we have a basis {v₁, ..., vₙ} for V and {w₁, ..., wₘ} for W, the matrix A for T is constructed such that its j-th column is the coordinate vector of T(vⱼ) with respect to the basis of W. This powerful idea connects the abstract theory of linear transformations with the concrete computations of matrix algebra.</p>`, hint: 'The columns of the matrix are the images of the basis vectors of the domain.', quiz: { question: 'A linear transformation from ℝ³ to ℝ² is represented by a matrix of what size?', options: ['3x2', '2x3', '3x3'], correctAnswer: 1 } },
    { id: 'LNA_L6', title: 'Determinants and Their Properties', points: 25, content: `<p>The <strong>determinant</strong> is a scalar value that can be computed from the elements of a square matrix. For a 2x2 matrix, det([[a,b],[c,d]]) = ad - bc. For larger matrices, it can be computed via cofactor expansion.</p><p>The determinant has important properties and geometric interpretations. A matrix A is invertible if and only if <strong>det(A) ≠ 0</strong>. The absolute value of the determinant represents the scaling factor of the area or volume under the corresponding linear transformation.</p>`, hint: 'The determinant of a product of matrices is the product of their determinants.', quiz: { question: 'If a square matrix A has a determinant of 0, the matrix is...', options: ['Invertible', 'Singular (not invertible)', 'Always symmetric'], correctAnswer: 1 } },
    { id: 'LNA_L7', title: 'Eigenvalues and Eigenvectors', points: 30, content: `<p>An <strong>eigenvector</strong> of a square matrix A is a non-zero vector v such that when A acts on v, the direction of v is unchanged; it is only scaled by a factor λ. We write this as <strong>Av = λv</strong>.</p><p>The scalar λ is called the corresponding <strong>eigenvalue</strong>. Eigenvalues and eigenvectors are crucial in many applications, such as solving systems of differential equations, vibration analysis, and data science algorithms like Principal Component Analysis (PCA).</p>`, hint: 'Eigenvectors give the "axes" along which a linear transformation acts simply.', quiz: { question: 'If λ is an eigenvalue of an invertible matrix A, what is an eigenvalue of A⁻¹?', options: ['λ', '-λ', '1/λ'], correctAnswer: 2 } },
    { id: 'LNA_L8', title: 'Diagonalization', points: 35, content: `<p>A square matrix A is <strong>diagonalizable</strong> if it is similar to a diagonal matrix D. This means there exists an invertible matrix P such that <strong>A = PDP⁻¹</strong>. The columns of the matrix P are the eigenvectors of A, and the diagonal entries of D are the corresponding eigenvalues.</p><p>An n x n matrix is diagonalizable if and only if it has n linearly independent eigenvectors. This makes computations involving the matrix, such as finding its powers (Aᵏ), much simpler.</p>`, hint: 'Not all matrices are diagonalizable.', quiz: { question: 'An n x n matrix is diagonalizable if and only if it has...', options: ['n distinct eigenvalues', 'n linearly independent eigenvectors', 'a non-zero determinant'], correctAnswer: 1 } },
    { id: 'LNA_L9', title: 'Inner Product Spaces', points: 30, content: `<p>An <strong>inner product space</strong> is a vector space V over the field of real or complex numbers, together with an operation called an inner product. This operation associates each pair of vectors u, v with a scalar <u,v> that satisfies certain axioms.</p><p>The inner product allows the generalization of geometric concepts like length (norm), distance, and angle to abstract vector spaces. The norm of a vector v is defined as ||v|| = √<v,v>. Two vectors are <strong>orthogonal</strong> if their inner product is zero.</p>`, hint: 'The standard dot product in ℝⁿ is an inner product.', quiz: { question: 'The Cauchy-Schwarz inequality states |<u,v>| ≤ ...', options: ['||u|| + ||v||', '||u|| ||v||', '||u+v||'], correctAnswer: 1 } },
    { id: 'LNA_L10', title: 'The Gram-Schmidt Process', points: 35, content: '<p>The <strong>Gram-Schmidt process</strong> is a powerful and widely used algorithm in linear algebra for constructing an <strong>orthonormal</strong> (or orthogonal) basis from an arbitrary basis in a finite-dimensional inner product space.</p><p>Starting with a basis {v₁, ..., vₙ}, the process works iteratively. It defines the first vector of the new basis, u₁, to be v₁. Then, for each subsequent vector vₖ, it subtracts the projection of vₖ onto the subspace spanned by the previously constructed vectors {u₁, ..., uₖ₋₁}. This results in a new vector uₖ that is orthogonal to all preceding vectors. Finally, each vector uₖ is normalized (divided by its length) to produce an orthonormal basis.</p>', hint: 'The process involves successively subtracting vector projections.', quiz: { question: 'The Gram-Schmidt process is used to create...', options: ['An orthogonal/orthonormal basis', 'A set of eigenvalues', 'The inverse of a matrix'], correctAnswer: 0 } },
];
const achievements = [
    { id: 'UVT1', name: 'Structurist', description: 'Complete the first lesson on sets and relations.', icon: 'fa-solid fa-sitemap'},
    { id: 'UVT2', name: 'Group Adept', description: 'Complete the "Group Theory: Definition" lesson.', icon: 'fa-solid fa-puzzle-piece'},
    { id: 'UVT3', name: 'Morphism Master', description: 'Complete the lesson on subgroups and morphisms.', icon: 'fa-solid-right-long'},
    { id: 'UVT4', name: 'Ring Leader', description: 'Complete the "Ring Theory: Definition" lesson.', icon: 'fa-solid fa-ring' },
    { id: 'UVT5', name: 'Idealist', description: 'Complete the final lesson on ideals.', icon: 'fa-solid fa-bullseye' },
    { id: 'UVT6', name: 'Timișoara Scholar', description: 'Complete all available UVT curriculum lessons.', icon: 'fa-solid fa-graduation-cap' }
];

// --- API ROUTES ---
app.post('/api/register', async (req, res) => {
    const { email, username, password } = req.body;
    const existingUser = await db.get('SELECT * FROM users WHERE email = ?', email);
    if (existingUser) { return res.status(400).json({ message: 'Email already registered.' }); }
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    await db.run('INSERT INTO users (email, username, password) VALUES (?, ?, ?)', email, username, hashedPassword);
    res.status(201).json({ message: 'Registration successful!' });
});
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await db.get('SELECT * FROM users WHERE email = ?', email);
    if (user && await bcrypt.compare(password, user.password)) {
        const today = new Date().toISOString().split('T')[0];
        if (user.lastLoginDate !== today) {
            const yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0];
            const newStreak = user.lastLoginDate === yesterday ? user.dailyStreak + 1 : 1;
            await db.run('UPDATE users SET lastLoginDate = ?, dailyStreak = ? WHERE email = ?', today, newStreak, email);
        }
        res.json({ email: user.email, username: user.username, message: 'Login successful' });
    } else {
        res.status(401).json({ message: 'Invalid credentials.' });
    }
});
app.get('/api/lessons', (req, res) => res.json(lessons));
app.get('/api/achievements', (req, res) => res.json(achievements));
app.get('/api/leaderboard', async (req, res) => {
    const users = await db.all('SELECT username, points FROM users ORDER BY points DESC LIMIT 10');
    res.json(users);
});
app.get('/api/user/:email', async (req, res) => {
    const user = await db.get('SELECT email, username, points, dailyStreak, completedLessons, unlockedAchievements FROM users WHERE email = ?', req.params.email);
    if(user) {
        user.completedLessons = JSON.parse(user.completedLessons);
        user.unlockedAchievements = JSON.parse(user.unlockedAchievements);
        res.json(user);
    } else { res.status(404).send('User not found'); }
});
app.get('/api/problems/:email', async (req, res) => {
    const problems = await db.all('SELECT * FROM problems WHERE userEmail = ?', req.params.email);
    res.json(problems);
});
app.post('/api/problems', async (req, res) => {
    const { userEmail, title, equation, difficulty } = req.body;
    const pointsMap = {'Easy': 5, 'Medium': 10, 'Hard': 20};
    const points = pointsMap[difficulty] || 5;
    const newProblem = { id: `p${Date.now()}`, userEmail, title, equation, difficulty, solved: 0 };
    await db.run('INSERT INTO problems VALUES (?, ?, ?, ?, ?, ?)', newProblem.id, newProblem.userEmail, newProblem.title, newProblem.equation, newProblem.difficulty, newProblem.solved);
    await db.run('UPDATE users SET points = points + ? WHERE email = ?', points, userEmail);
    res.status(201).json({ message: `Problem added! +${points} points.`});
});
app.post('/api/solve-problem/:id', (req, res) => {
    res.json({ success: true, result: "Problem marked as reviewed." });
});
app.delete('/api/problems/:id', async (req, res) => {
    await db.run('DELETE FROM problems WHERE id = ?', req.params.id);
    res.status(200).json({ message: 'Problem deleted.'});
});
app.post('/api/log-attempt', async (req, res) => {
    const { userEmail, lessonId, is_correct } = req.body;
    await db.run('INSERT INTO quiz_attempts (userEmail, lessonId, is_correct) VALUES (?, ?, ?)', userEmail, lessonId, is_correct);
    if (is_correct) {
        const user = await db.get('SELECT completedLessons FROM users WHERE email = ?', userEmail);
        let completed = JSON.parse(user.completedLessons);
        if (!completed.includes(lessonId)) {
            const lesson = lessons.find(l => l.id === lessonId);
            if(lesson) {
                completed.push(lessonId);
                await db.run('UPDATE users SET points = points + ?, completedLessons = ? WHERE email = ?', lesson.points, JSON.stringify(completed), userEmail);
                return res.json({ message: `Correct! You earned ${lesson.points} points.` });
            }
        }
        return res.json({ message: 'Correct!' });
    } else {
        return res.json({ message: 'Incorrect. Keep trying!' });
    }
});
app.get('/api/user/:email/analytics', async (req, res) => {
    const { email } = req.params;
    const attempts = await db.all('SELECT lessonId, is_correct FROM quiz_attempts WHERE userEmail = ?', email);
    if (attempts.length === 0) {
        return res.json({ totalAttempts: 0, overallAccuracy: 0, masteredTopics: [], struggleTopics: [], accuracyByLesson: {} });
    }
    const accuracyByLesson = {};
    lessons.forEach(l => {
        const lessonAttempts = attempts.filter(a => a.lessonId === l.id);
        if (lessonAttempts.length > 0) {
            const correctCount = lessonAttempts.filter(a => a.is_correct).length;
            accuracyByLesson[l.title] = (correctCount / lessonAttempts.length) * 100;
        }
    });
    const masteredTopics = Object.keys(accuracyByLesson).filter(key => accuracyByLesson[key] >= 80);
    const struggleTopics = Object.keys(accuracyByLesson).filter(key => accuracyByLesson[key] < 50);
    const overallAccuracy = (attempts.filter(a => a.is_correct).length / attempts.length) * 100;
    res.json({
        totalAttempts: attempts.length,
        overallAccuracy: overallAccuracy.toFixed(1),
        masteredTopics,
        struggleTopics,
        accuracyByLesson
    });
});
app.get('/api/quiz/random', (req, res) => {
    const count = parseInt(req.query.count, 10) || 10;
    const shuffledLessons = _.shuffle(lessons);
    const quizLessons = shuffledLessons.slice(0, count);
    res.json(quizLessons);
});

initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});