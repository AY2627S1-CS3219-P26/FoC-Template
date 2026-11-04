variable "region" {
  description = "AWS region. Singapore is closest to campus and allowed in the NUS sandbox."
  type        = string
  default     = "ap-southeast-1"
}

variable "instance_type" {
  description = "One machine for the whole system. 4 vCPUs and 16 GB fit all services, their databases and extra replicas while scaling."
  type        = string
  default     = "t3.xlarge"
}

variable "k3s_version" {
  description = "k3s release, the same Kubernetes version as the local k3d cluster."
  type        = string
  default     = "v1.36.4+k3s1"
}

variable "ssh_public_key" {
  description = "Public key that may log in as ubuntu."
  type        = string
  default     = "~/.ssh/relay-aws.pub"
}

variable "admin_cidrs" {
  description = "Addresses allowed to reach SSH and the Kubernetes API. Empty means only the address you run terraform from."
  type        = list(string)
  default     = []
}
